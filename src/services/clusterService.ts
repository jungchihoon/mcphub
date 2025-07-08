/**
 * 클러스터 서비스
 * 
 * Node.js cluster 모듈을 사용하여 마스터-워커 프로세스 구조를 구현합니다.
 * Kubernetes 환경에서의 수평적 확장성과 고가용성을 위해 설계되었습니다.
 * 
 * 주요 기능:
 * - 마스터 프로세스: 워커 관리, 로드 밸런싱, 상태 모니터링
 * - 워커 프로세스: 실제 MCP 서버 처리, Express 서버 실행
 * - 자동 재시작: 워커 프로세스 장애 시 자동 복구
 * - 부하 분산: 라운드로빈 방식의 요청 분산
 * - 그레이스풀 셧다운: 안전한 프로세스 종료
 */

import cluster from 'cluster';
import os from 'os';
import config from '../config/index.js';
import { EventEmitter } from 'events';

/**
 * 워커 프로세스 정보 인터페이스
 */
interface WorkerInfo {
  /** 워커 ID */
  id: number;
  /** 프로세스 ID */
  pid: number;
  /** 워커 시작 시간 */
  startTime: number;
  /** 재시작 횟수 */
  restartCount: number;
  /** 마지막 재시작 시간 */
  lastRestartTime?: number;
  /** 현재 상태 */
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
  /** 처리 중인 요청 수 */
  activeConnections: number;
}

/**
 * 클러스터 이벤트 타입
 */
interface ClusterEvents {
  'worker-started': (worker: WorkerInfo) => void;
  'worker-stopped': (worker: WorkerInfo) => void;
  'worker-failed': (worker: WorkerInfo, error: Error) => void;
  'cluster-ready': () => void;
  'cluster-shutdown': () => void;
}

/**
 * 클러스터 관리 서비스 클래스
 * 
 * 마스터 프로세스에서 실행되어 워커 프로세스들을 관리하고 모니터링합니다.
 */
export class ClusterService extends EventEmitter {
  /** 워커 정보 저장소 */
  private workers: Map<number, WorkerInfo> = new Map();
  /** 셧다운 진행 중 플래그 */
  private isShuttingDown = false;
  /** 자동 재시작 비활성화 플래그 */
  private autoRestartDisabled = false;

  /**
   * 클러스터 서비스 생성자
   */
  constructor() {
    super();
    this.setupSignalHandlers();
  }

  /**
   * 클러스터 모드 시작
   * 
   * 마스터 프로세스에서 호출되어 지정된 수의 워커 프로세스를 생성합니다.
   * 
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    if (!cluster.isPrimary) {
      throw new Error('ClusterService.start() can only be called from the primary process');
    }

    console.log(`🚀 Starting MCPHub cluster with ${config.cluster.workers} workers...`);
    console.log(`📊 CPU cores: ${os.cpus().length}, Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);

    // 워커 이벤트 핸들러 설정
    this.setupWorkerEventHandlers();

    // 지정된 수의 워커 프로세스 생성
    for (let i = 0; i < config.cluster.workers; i++) {
      await this.createWorker();
      // 워커 간 시작 간격을 두어 동시 초기화로 인한 부하 방지
      await this.delay(100);
    }

    console.log(`✅ Cluster started successfully with ${this.workers.size} workers`);
    this.emit('cluster-ready');
  }

  /**
   * 새 워커 프로세스 생성
   * 
   * @returns {Promise<WorkerInfo>} 생성된 워커 정보
   */
  private async createWorker(): Promise<WorkerInfo> {
    return new Promise((resolve, reject) => {
      const worker = cluster.fork();
      const workerId = worker.id;

      const workerInfo: WorkerInfo = {
        id: workerId,
        pid: worker.process.pid!,
        startTime: Date.now(),
        restartCount: 0,
        status: 'starting',
        activeConnections: 0,
      };

      this.workers.set(workerId, workerInfo);

      // 워커 시작 완료 대기
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} failed to start within timeout`));
      }, 30000); // 30초 타임아웃

      worker.once('message', (message) => {
        if (message === 'worker-ready') {
          clearTimeout(timeout);
          workerInfo.status = 'running';
          console.log(`✅ Worker ${workerId} (PID: ${workerInfo.pid}) started successfully`);
          this.emit('worker-started', workerInfo);
          resolve(workerInfo);
        }
      });

      worker.once('exit', () => {
        clearTimeout(timeout);
        if (workerInfo.status === 'starting') {
          reject(new Error(`Worker ${workerId} exited during startup`));
        }
      });
    });
  }

  /**
   * 워커 이벤트 핸들러 설정
   */
  private setupWorkerEventHandlers(): void {
    cluster.on('exit', (worker, code, signal) => {
      const workerId = worker.id;
      const workerInfo = this.workers.get(workerId);

      if (!workerInfo) {
        return;
      }

      console.log(`⚠️ Worker ${workerId} (PID: ${workerInfo.pid}) exited with code ${code} and signal ${signal}`);

      // 워커 상태 업데이트
      if (code === 0) {
        workerInfo.status = 'stopped';
      } else {
        workerInfo.status = 'failed';
        this.emit('worker-failed', workerInfo, new Error(`Worker exited with code ${code}`));
      }

      this.emit('worker-stopped', workerInfo);

      // 자동 재시작 로직
      if (!this.isShuttingDown && !this.autoRestartDisabled) {
        this.handleWorkerRestart(workerInfo);
      } else {
        this.workers.delete(workerId);
      }
    });

    cluster.on('disconnect', (worker) => {
      console.log(`🔌 Worker ${worker.id} disconnected`);
    });
  }

  /**
   * 워커 재시작 처리
   * 
   * @param {WorkerInfo} workerInfo - 재시작할 워커 정보
   */
  private async handleWorkerRestart(workerInfo: WorkerInfo): Promise<void> {
    const { id, restartCount, lastRestartTime } = workerInfo;

    // 최대 재시작 횟수 확인
    if (restartCount >= config.cluster.maxRestarts) {
      console.error(`❌ Worker ${id} exceeded maximum restart attempts (${config.cluster.maxRestarts})`);
      this.workers.delete(id);
      return;
    }

    // 재시작 간격 제한 (무한 재시작 방지)
    const now = Date.now();
    if (lastRestartTime && (now - lastRestartTime) < config.cluster.restartDelay) {
      console.warn(`⏳ Delaying restart of worker ${id} to prevent rapid restart loop`);
      await this.delay(config.cluster.restartDelay);
    }

    try {
      console.log(`🔄 Restarting worker ${id} (attempt ${restartCount + 1}/${config.cluster.maxRestarts})`);
      
      // 기존 워커 정보 제거
      this.workers.delete(id);
      
      // 새 워커 생성
      const newWorkerInfo = await this.createWorker();
      newWorkerInfo.restartCount = restartCount + 1;
      newWorkerInfo.lastRestartTime = now;
      
      console.log(`✅ Worker ${id} restarted successfully as worker ${newWorkerInfo.id}`);
    } catch (error) {
      console.error(`❌ Failed to restart worker ${id}:`, error);
      this.workers.delete(id);
    }
  }

  /**
   * 클러스터 그레이스풀 셧다운
   * 
   * 모든 워커 프로세스를 안전하게 종료합니다.
   * 
   * @param {number} [timeout=30000] - 셧다운 타임아웃 (밀리초)
   * @returns {Promise<void>}
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.autoRestartDisabled = true;

    console.log('🛑 Initiating graceful cluster shutdown...');

    const workers = Array.from(this.workers.values());
    
    if (workers.length === 0) {
      console.log('✅ No workers to shutdown');
      this.emit('cluster-shutdown');
      return;
    }

    // 모든 워커에게 종료 신호 전송
    workers.forEach((workerInfo) => {
      const worker = cluster.workers[workerInfo.id];
      if (worker && !worker.isDead()) {
        console.log(`📨 Sending shutdown signal to worker ${workerInfo.id}`);
        worker.send('shutdown');
        workerInfo.status = 'stopping';
      }
    });

    // 워커들이 정상적으로 종료될 때까지 대기
    const shutdownPromise = this.waitForWorkersToExit();
    
    // 타임아웃 처리
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Shutdown timeout after ${timeout}ms`));
      }, timeout);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
      console.log('✅ All workers shutdown gracefully');
    } catch (error) {
      console.warn('⚠️ Graceful shutdown timeout, force killing workers...');
      await this.forceKillWorkers();
    }

    this.emit('cluster-shutdown');
  }

  /**
   * 모든 워커의 종료를 대기
   * 
   * @returns {Promise<void>}
   */
  private waitForWorkersToExit(): Promise<void> {
    return new Promise((resolve) => {
      const checkWorkers = () => {
        const aliveWorkers = Array.from(this.workers.values()).filter(
          (workerInfo) => {
            const worker = cluster.workers[workerInfo.id];
            return worker && !worker.isDead();
          }
        );

        if (aliveWorkers.length === 0) {
          resolve();
        } else {
          setTimeout(checkWorkers, 100);
        }
      };

      checkWorkers();
    });
  }

  /**
   * 워커 프로세스 강제 종료
   * 
   * @returns {Promise<void>}
   */
  private async forceKillWorkers(): Promise<void> {
    const workers = Array.from(this.workers.values());
    
    for (const workerInfo of workers) {
      const worker = cluster.workers[workerInfo.id];
      if (worker && !worker.isDead()) {
        console.log(`💀 Force killing worker ${workerInfo.id}`);
        worker.kill('SIGKILL');
      }
    }

    // 강제 종료 후 잠시 대기
    await this.delay(1000);
  }

  /**
   * 클러스터 상태 정보 조회
   * 
   * @returns {object} 클러스터 상태 정보
   */
  getClusterStatus() {
    const workers = Array.from(this.workers.values());
    
    return {
      totalWorkers: workers.length,
      runningWorkers: workers.filter(w => w.status === 'running').length,
      failedWorkers: workers.filter(w => w.status === 'failed').length,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      workers: workers.map(w => ({
        id: w.id,
        pid: w.pid,
        status: w.status,
        uptime: Date.now() - w.startTime,
        restartCount: w.restartCount,
        activeConnections: w.activeConnections,
      })),
    };
  }

  /**
   * 시스템 신호 핸들러 설정
   */
  private setupSignalHandlers(): void {
    // 그레이스풀 셧다운 신호 처리
    const signals = ['SIGTERM', 'SIGINT'];
    
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`📡 Received ${signal}, initiating graceful shutdown...`);
        try {
          await this.shutdown();
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

    // 예상치 못한 에러 처리
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception in master process:', error);
      this.shutdown().finally(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚫 Unhandled Rejection in master process:', reason);
      console.error('Promise:', promise);
    });
  }

  /**
   * 지연 함수
   * 
   * @param {number} ms - 지연 시간 (밀리초)
   * @returns {Promise<void>}
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 워커 프로세스에서 실행되는 초기화 함수
 * 
 * 워커 프로세스가 시작될 때 마스터에게 준비 완료 신호를 보냅니다.
 */
export function initializeWorker(): void {
  if (cluster.isWorker) {
    console.log(`🔧 Worker ${process.pid} initializing...`);
    
    // 마스터로부터의 셧다운 신호 처리
    process.on('message', (message) => {
      if (message === 'shutdown') {
        console.log(`📨 Worker ${process.pid} received shutdown signal`);
        gracefulWorkerShutdown();
      }
    });

    // 워커 준비 완료 신호 전송
    if (process.send) {
      process.send('worker-ready');
    }
  }
}

/**
 * 워커 프로세스 그레이스풀 셧다운
 */
async function gracefulWorkerShutdown(): Promise<void> {
  console.log(`🛑 Worker ${process.pid} starting graceful shutdown...`);
  
  try {
    // 여기에 현재 연결/작업 정리 로직 추가
    // 예: 활성 MCP 연결 종료, 진행 중인 요청 완료 대기 등
    
    // Express 서버 종료 (AppServer 인스턴스가 있다면)
    // await appServer.close();
    
    console.log(`✅ Worker ${process.pid} shutdown completed`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error during worker shutdown:`, error);
    process.exit(1);
  }
} 