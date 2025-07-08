/**
 * 헬스체크 컨트롤러
 * 
 * Kubernetes 환경에서 liveness probe와 readiness probe를 위한 헬스체크 엔드포인트를 제공합니다.
 * 애플리케이션의 상태, 의존성 서비스 연결 상태 등을 확인할 수 있습니다.
 * 
 * 주요 기능:
 * - 기본 헬스체크 (liveness probe용)
 * - 상세 헬스체크 (readiness probe용)
 * - 클러스터 상태 정보 제공
 * - 의존성 서비스 상태 확인
 */

import { Request, Response } from 'express';
import { redisService } from '../services/redisService.js';
import { getServerInfos } from '../services/mcpService.js';
import config from '../config/index.js';

/**
 * 헬스체크 상태 인터페이스
 */
interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  processId: number;
  clusterMode: boolean;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
    };
  };
}

/**
 * 기본 헬스체크 엔드포인트
 * 
 * Kubernetes liveness probe에서 사용하는 간단한 헬스체크입니다.
 * 애플리케이션이 살아있는지만 확인합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      version: config.mcpHubVersion,
      environment: process.env.NODE_ENV || 'development',
      processId: process.pid,
      clusterMode: config.cluster.enabled,
      checks: {
        process: {
          status: 'pass',
          message: 'Process is running normally',
        },
      },
    };

    res.status(200).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: 'Internal server error',
    });
  }
};

/**
 * 상세 헬스체크 엔드포인트
 * 
 * Kubernetes readiness probe에서 사용하는 상세한 헬스체크입니다.
 * 모든 의존성 서비스의 상태를 확인합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 */
export const getDetailedHealth = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: startTime,
    uptime: process.uptime(),
    version: config.mcpHubVersion,
    environment: process.env.NODE_ENV || 'development',
    processId: process.pid,
    clusterMode: config.cluster.enabled,
    checks: {},
  };

  try {
    // 1. 프로세스 상태 확인
    health.checks.process = {
      status: 'pass',
      message: 'Process is running normally',
      duration: 0,
    };

    // 2. 메모리 사용량 확인
    const memoryCheck = await checkMemoryUsage();
    health.checks.memory = memoryCheck;
    if (memoryCheck.status === 'fail') {
      overallStatus = 'unhealthy';
    } else if (memoryCheck.status === 'warn') {
      overallStatus = 'degraded';
    }

    // 3. Redis 연결 상태 확인
    if (config.redis.enabled) {
      const redisCheck = await checkRedisConnection();
      health.checks.redis = redisCheck;
      if (redisCheck.status === 'fail') {
        overallStatus = 'degraded'; // Redis 실패는 degraded로 처리
      }
    }

    // 4. MCP 서버 연결 상태 확인
    const mcpCheck = await checkMcpServers();
    health.checks.mcpServers = mcpCheck;
    if (mcpCheck.status === 'fail') {
      overallStatus = 'degraded';
    }

    // 5. 전체 응답 시간 확인
    const duration = Date.now() - startTime;
    health.checks.responseTime = {
      status: duration < 5000 ? 'pass' : 'warn',
      message: `Health check completed in ${duration}ms`,
      duration,
    };

    if (duration > 10000) {
      overallStatus = 'degraded';
    }

    health.status = overallStatus;

    // 상태에 따른 HTTP 상태 코드 설정
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: 'Health check failed',
      checks: health.checks,
    });
  }
};

/**
 * 클러스터 상태 정보 엔드포인트
 * 
 * 클러스터 모드에서 워커 프로세스들의 상태 정보를 제공합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 */
export const getClusterStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!config.cluster.enabled) {
      res.status(200).json({
        clusterMode: false,
        message: 'Single mode - no cluster information available',
      });
      return;
    }

    // Redis에서 워커 상태 정보 조회
    let workerStates = [];
    if (config.redis.enabled && redisService.isRedisConnected()) {
      workerStates = await redisService.getAllWorkerStates();
    }

    const clusterInfo = {
      clusterMode: true,
      masterPid: process.pid,
      timestamp: Date.now(),
      workers: workerStates.map(worker => ({
        id: worker.id,
        pid: worker.pid,
        status: worker.status,
        uptime: Date.now() - worker.startTime,
        lastHeartbeat: worker.lastHeartbeat,
        activeConnections: worker.activeConnections,
        memoryUsage: formatBytes(worker.memoryUsage),
        cpuUsage: worker.cpuUsage,
      })),
      summary: {
        totalWorkers: workerStates.length,
        runningWorkers: workerStates.filter(w => w.status === 'running').length,
        stoppedWorkers: workerStates.filter(w => w.status === 'stopped').length,
      },
    };

    res.status(200).json(clusterInfo);

  } catch (error) {
    console.error('Cluster status check failed:', error);
    res.status(500).json({
      error: 'Failed to get cluster status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 메모리 사용량 확인
 */
async function checkMemoryUsage() {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  let status: 'pass' | 'warn' | 'fail' = 'pass';
  let message = `Memory usage: ${heapUsedMB}MB/${heapTotalMB}MB (${usagePercentage}%)`;

  if (usagePercentage > 90) {
    status = 'fail';
    message += ' - Critical memory usage';
  } else if (usagePercentage > 80) {
    status = 'warn';
    message += ' - High memory usage';
  }

  return { status, message };
}

/**
 * Redis 연결 상태 확인
 */
async function checkRedisConnection() {
  const startTime = Date.now();
  
  try {
    if (!redisService.isRedisConnected()) {
      return {
        status: 'fail' as const,
        message: 'Redis is not connected',
        duration: Date.now() - startTime,
      };
    }

    // Redis ping 테스트
    const client = redisService.getClient();
    if (client) {
      await client.ping();
    }

    return {
      status: 'pass' as const,
      message: 'Redis connection is healthy',
      duration: Date.now() - startTime,
    };

  } catch (error) {
    return {
      status: 'fail' as const,
      message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * MCP 서버 연결 상태 확인
 */
async function checkMcpServers() {
  const startTime = Date.now();
  
  try {
    const serverInfos = getServerInfos();
    const totalServers = serverInfos.length;
    const connectedServers = serverInfos.filter(server => server.status === 'connected').length;
    const failedServers = serverInfos.filter(server => server.status === 'disconnected' || server.status === 'failed').length;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = `MCP servers: ${connectedServers}/${totalServers} connected`;

    if (totalServers === 0) {
      status = 'warn';
      message = 'No MCP servers configured';
    } else if (connectedServers === 0) {
      status = 'fail';
      message = 'No MCP servers connected';
    } else if (failedServers > 0) {
      status = 'warn';
      message += `, ${failedServers} failed`;
    }

    return {
      status,
      message,
      duration: Date.now() - startTime,
    };

  } catch (error) {
    return {
      status: 'fail' as const,
      message: `MCP servers check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 바이트를 읽기 쉬운 형태로 포맷
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 