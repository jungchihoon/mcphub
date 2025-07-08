/**
 * MCPHub 애플리케이션의 메인 진입점
 * 
 * 이 파일은 MCPHub 서버 애플리케이션을 시작하는 역할을 합니다.
 * 클러스터 모드와 싱글 모드를 모두 지원하며, 환경에 따라 적절한 모드로 시작됩니다.
 * 
 * - 클러스터 모드: 마스터 프로세스가 여러 워커 프로세스를 관리
 * - 싱글 모드: 기존과 동일한 단일 프로세스 방식
 * - TypeORM 메타데이터 리플렉션 설정
 * - 서버 인스턴스 생성 및 초기화
 * - 애플리케이션 부팅 프로세스 관리
 */

import 'reflect-metadata'; // TypeORM 데코레이터 메타데이터 지원을 위해 필요
import cluster from 'cluster';
import config from './config/index.js';
import { ClusterService } from './services/clusterService.js';
import { initializeWorker } from './services/clusterService.js';
import { redisService } from './services/redisService.js';
import AppServer from './server.js';

/**
 * 마스터 프로세스 부팅 함수
 * 
 * 클러스터 모드에서 마스터 프로세스가 실행하는 함수입니다.
 * 워커 프로세스들을 생성하고 관리합니다.
 * 
 * @throws {Error} 클러스터 초기화 과정에서 오류 발생 시
 */
async function bootMaster() {
  console.log('🎯 Starting MCPHub in cluster mode as master process');
  console.log(`📊 Process ID: ${process.pid}`);
  console.log(`🔧 Workers to spawn: ${config.cluster.workers}`);
  
  try {
    // Redis 연결 (마스터에서만 초기화)
    if (config.redis.enabled) {
      await redisService.connect();
      console.log('✅ Redis connection established in master process');
    }

    // 클러스터 서비스 초기화 및 시작
    const clusterService = new ClusterService();
    
    // 클러스터 이벤트 핸들러 설정
    clusterService.on('cluster-ready', () => {
      console.log('🎉 Cluster is ready and all workers are running');
    });

    clusterService.on('worker-started', (worker) => {
      console.log(`✨ Worker ${worker.id} (PID: ${worker.pid}) joined the cluster`);
    });

    clusterService.on('worker-failed', (worker, error) => {
      console.error(`💥 Worker ${worker.id} failed:`, error.message);
    });

    clusterService.on('cluster-shutdown', () => {
      console.log('👋 Cluster shutdown completed');
      // Redis 연결 종료
      if (config.redis.enabled) {
        redisService.disconnect().catch(console.error);
      }
    });

    // 클러스터 시작
    await clusterService.start();

    // 클러스터 상태 모니터링 (10초마다)
    setInterval(() => {
      const status = clusterService.getClusterStatus();
      console.log(`📊 Cluster Status: ${status.runningWorkers}/${status.totalWorkers} workers running`);
    }, 60000); // 1분마다

  } catch (error) {
    console.error('❌ Failed to start master process:', error);
    process.exit(1);
  }
}

/**
 * 워커 프로세스 부팅 함수
 * 
 * 클러스터 모드에서 워커 프로세스가 실행하는 함수입니다.
 * 실제 애플리케이션 서버를 초기화하고 시작합니다.
 * 
 * @throws {Error} 워커 초기화 과정에서 오류 발생 시
 */
async function bootWorker() {
  console.log(`🔧 Starting MCPHub worker process (PID: ${process.pid})`);
  
  try {
    // 워커 초기화 (마스터에게 준비 완료 신호 전송)
    initializeWorker();

    // Redis 연결 (워커에서도 필요한 경우)
    if (config.redis.enabled) {
      await redisService.connect();
      console.log(`✅ Redis connection established in worker ${process.pid}`);
    }

    // 애플리케이션 서버 인스턴스 생성
    const appServer = new AppServer();
    
    // 서버 초기화 (데이터베이스 연결, MCP 서버 연결 등)
    await appServer.initialize();
    
    // HTTP 서버 시작
    appServer.start();
    
    console.log(`🚀 Worker ${process.pid} started successfully`);
    
  } catch (error) {
    console.error(`❌ Failed to start worker process ${process.pid}:`, error);
    process.exit(1);
  }
}

/**
 * 싱글 모드 부팅 함수
 * 
 * 기존과 동일한 단일 프로세스 방식으로 애플리케이션을 시작합니다.
 * 
 * @throws {Error} 초기화 또는 시작 과정에서 오류 발생 시
 */
async function bootSingle() {
  console.log('🎯 Starting MCPHub in single mode');
  console.log(`📊 Process ID: ${process.pid}`);
  
  try {
    // Redis 연결 (필요한 경우)
    if (config.redis.enabled) {
      await redisService.connect();
      console.log('✅ Redis connection established');
    }

    // 애플리케이션 서버 인스턴스 생성
    const appServer = new AppServer();
    
    // 서버 초기화 (데이터베이스 연결, MCP 서버 연결 등)
    await appServer.initialize();
    
    // HTTP 서버 시작
    appServer.start();
    
    console.log('🚀 MCPHub started successfully in single mode');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * 애플리케이션 부팅 메인 함수
 * 
 * 설정에 따라 클러스터 모드 또는 싱글 모드로 애플리케이션을 시작합니다.
 */
async function boot() {
  console.log('🎬 MCPHub is starting...');
  console.log(`🔧 Node.js version: ${process.version}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚙️ Cluster mode: ${config.cluster.enabled ? 'enabled' : 'disabled'}`);
  
  // GC 최적화 설정 적용 (클러스터 모드에서만)
  if (config.cluster.enabled && config.cluster.gcOptimize) {
    // 메모리 사용량을 줄이기 위한 V8 플래그들
    console.log('🔧 Applying GC optimizations for cluster mode');
  }
  
  if (config.cluster.enabled) {
    // 클러스터 모드
    if (cluster.isPrimary) {
      await bootMaster();
    } else {
      await bootWorker();
    }
  } else {
    // 싱글 모드 (기존 방식)
    await bootSingle();
  }
}

// 전역 에러 핸들러 설정
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // 애플리케이션을 즉시 종료하지 않고 로그만 남김
});

// SIGTERM 신호 처리 (Kubernetes 등에서 발생)
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, initiating graceful shutdown...');
  // 클러스터 모드에서는 ClusterService에서 처리
  // 싱글 모드에서는 여기서 처리
  if (!config.cluster.enabled) {
    process.exit(0);
  }
});

// SIGINT 신호 처리 (Ctrl+C)
process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, initiating graceful shutdown...');
  if (!config.cluster.enabled) {
    process.exit(0);
  }
});

// 애플리케이션 시작
boot().catch((error) => {
  console.error('💀 Failed to boot application:', error);
  process.exit(1);
});
