/**
 * Redis 상태 공유 서비스
 * 
 * 클러스터 모드에서 워커 프로세스 간 상태 정보를 공유하기 위한 Redis 기반 서비스입니다.
 * MCP 서버 상태, 세션 정보, 캐시 데이터 등을 중앙 집중식으로 관리합니다.
 * 
 * 주요 기능:
 * - 서버 상태 동기화: 모든 워커가 동일한 MCP 서버 상태 정보 공유
 * - 세션 관리: 클라이언트 세션 정보의 워커 간 공유
 * - 로드 밸런싱: 워커별 부하 정보 공유
 * - 실시간 알림: 상태 변경 시 모든 워커에게 알림
 * - 캐시 관리: 공통 캐시 데이터 저장 및 조회
 */

import Redis from 'ioredis';
import config from '../config/index.js';
import { EventEmitter } from 'events';

/**
 * Redis 이벤트 타입
 */
interface RedisEvents {
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
  'server-state-changed': (serverName: string, state: any) => void;
  'worker-state-changed': (workerId: string, state: any) => void;
}

/**
 * MCP 서버 상태 정보
 */
interface ServerState {
  name: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  lastUpdate: number;
  tools: any[];
  error?: string;
  workerId?: string;
}

/**
 * 워커 상태 정보
 */
interface WorkerState {
  id: string;
  pid: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  startTime: number;
  lastHeartbeat: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
}

/**
 * Redis 상태 공유 서비스 클래스
 */
export class RedisService extends EventEmitter {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly keyPrefix: string;

  constructor() {
    super();
    this.keyPrefix = config.redis.keyPrefix;
  }

  /**
   * Redis 연결 초기화
   * 
   * @returns {Promise<void>}
   */
  async connect(): Promise<void> {
    if (!config.redis.enabled) {
      console.log('📴 Redis is disabled, skipping connection');
      return;
    }

    try {
      console.log('🔄 Connecting to Redis...');
      
      // 메인 Redis 클라이언트 생성
      this.client = new Redis(config.redis.url, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // 구독용 Redis 클라이언트 생성
      this.subscriber = new Redis(config.redis.url, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // 이벤트 핸들러 설정
      this.setupEventHandlers();

      // 연결 시도
      await this.client.connect();
      await this.subscriber.connect();

      this.isConnected = true;
      console.log('✅ Redis connected successfully');
      this.emit('connected');

      // 구독 설정
      await this.setupSubscriptions();
      
      // 하트비트 시작
      this.startHeartbeat();

    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Redis 연결 종료
   * 
   * @returns {Promise<void>}
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from Redis...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    this.isConnected = false;
    this.emit('disconnected');
    console.log('✅ Redis disconnected');
  }

  /**
   * Redis 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    if (!this.client || !this.subscriber) return;

    this.client.on('error', (error) => {
      console.error('❌ Redis client error:', error);
      this.emit('error', error);
    });

    this.subscriber.on('error', (error) => {
      console.error('❌ Redis subscriber error:', error);
      this.emit('error', error);
    });

    this.client.on('close', () => {
      console.log('🔌 Redis client connection closed');
      this.isConnected = false;
    });

    this.subscriber.on('close', () => {
      console.log('🔌 Redis subscriber connection closed');
    });
  }

  /**
   * Redis 구독 설정
   */
  private async setupSubscriptions(): Promise<void> {
    if (!this.subscriber) return;

    // 서버 상태 변경 구독
    await this.subscriber.subscribe(`${this.keyPrefix}server-state-changed`);
    
    // 워커 상태 변경 구독
    await this.subscriber.subscribe(`${this.keyPrefix}worker-state-changed`);

    this.subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        if (channel === `${this.keyPrefix}server-state-changed`) {
          this.emit('server-state-changed', data.serverName, data.state);
        } else if (channel === `${this.keyPrefix}worker-state-changed`) {
          this.emit('worker-state-changed', data.workerId, data.state);
        }
      } catch (error) {
        console.error('❌ Error parsing Redis message:', error);
      }
    });
  }

  /**
   * MCP 서버 상태 저장
   * 
   * @param {string} serverName - 서버 이름
   * @param {ServerState} state - 서버 상태
   * @returns {Promise<void>}
   */
  async setServerState(serverName: string, state: ServerState): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping server state update');
      return;
    }

    try {
      const key = `${this.keyPrefix}server:${serverName}`;
      const stateWithTimestamp = {
        ...state,
        lastUpdate: Date.now(),
      };

      await this.client.setex(key, config.redis.ttl, JSON.stringify(stateWithTimestamp));
      
      // 상태 변경 알림 발행
      await this.client.publish(
        `${this.keyPrefix}server-state-changed`,
        JSON.stringify({ serverName, state: stateWithTimestamp })
      );

      console.log(`📊 Server state updated for ${serverName}: ${state.status}`);
    } catch (error) {
      console.error(`❌ Failed to set server state for ${serverName}:`, error);
    }
  }

  /**
   * MCP 서버 상태 조회
   * 
   * @param {string} serverName - 서버 이름
   * @returns {Promise<ServerState | null>} 서버 상태
   */
  async getServerState(serverName: string): Promise<ServerState | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const key = `${this.keyPrefix}server:${serverName}`;
      const data = await this.client.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data) as ServerState;
    } catch (error) {
      console.error(`❌ Failed to get server state for ${serverName}:`, error);
      return null;
    }
  }

  /**
   * 모든 MCP 서버 상태 조회
   * 
   * @returns {Promise<ServerState[]>} 모든 서버 상태 목록
   */
  async getAllServerStates(): Promise<ServerState[]> {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      const pattern = `${this.keyPrefix}server:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }

      const states = await this.client.mget(...keys);
      return states
        .filter(state => state !== null)
        .map(state => JSON.parse(state!)) as ServerState[];
    } catch (error) {
      console.error('❌ Failed to get all server states:', error);
      return [];
    }
  }

  /**
   * 워커 상태 저장
   * 
   * @param {string} workerId - 워커 ID
   * @param {WorkerState} state - 워커 상태
   * @returns {Promise<void>}
   */
  async setWorkerState(workerId: string, state: WorkerState): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping worker state update');
      return;
    }

    try {
      const key = `${this.keyPrefix}worker:${workerId}`;
      const stateWithTimestamp = {
        ...state,
        lastHeartbeat: Date.now(),
      };

      await this.client.setex(key, 300, JSON.stringify(stateWithTimestamp)); // 5분 TTL
      
      // 상태 변경 알림 발행
      await this.client.publish(
        `${this.keyPrefix}worker-state-changed`,
        JSON.stringify({ workerId, state: stateWithTimestamp })
      );

    } catch (error) {
      console.error(`❌ Failed to set worker state for ${workerId}:`, error);
    }
  }

  /**
   * 모든 워커 상태 조회
   * 
   * @returns {Promise<WorkerState[]>} 모든 워커 상태 목록
   */
  async getAllWorkerStates(): Promise<WorkerState[]> {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      const pattern = `${this.keyPrefix}worker:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }

      const states = await this.client.mget(...keys);
      return states
        .filter(state => state !== null)
        .map(state => JSON.parse(state!)) as WorkerState[];
    } catch (error) {
      console.error('❌ Failed to get all worker states:', error);
      return [];
    }
  }

  /**
   * 세션 정보 저장
   * 
   * @param {string} sessionId - 세션 ID
   * @param {any} sessionData - 세션 데이터
   * @param {number} [ttl] - TTL (초)
   * @returns {Promise<void>}
   */
  async setSession(sessionId: string, sessionData: any, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const key = `${this.keyPrefix}session:${sessionId}`;
      const expiry = ttl || config.redis.ttl;
      
      await this.client.setex(key, expiry, JSON.stringify(sessionData));
    } catch (error) {
      console.error(`❌ Failed to set session ${sessionId}:`, error);
    }
  }

  /**
   * 세션 정보 조회
   * 
   * @param {string} sessionId - 세션 ID
   * @returns {Promise<any | null>} 세션 데이터
   */
  async getSession(sessionId: string): Promise<any | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const key = `${this.keyPrefix}session:${sessionId}`;
      const data = await this.client.get(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * 캐시 데이터 저장
   * 
   * @param {string} key - 캐시 키
   * @param {any} data - 캐시할 데이터
   * @param {number} [ttl] - TTL (초)
   * @returns {Promise<void>}
   */
  async setCache(key: string, data: any, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const cacheKey = `${this.keyPrefix}cache:${key}`;
      const expiry = ttl || config.redis.ttl;
      
      await this.client.setex(cacheKey, expiry, JSON.stringify(data));
    } catch (error) {
      console.error(`❌ Failed to set cache ${key}:`, error);
    }
  }

  /**
   * 캐시 데이터 조회
   * 
   * @param {string} key - 캐시 키
   * @returns {Promise<any | null>} 캐시된 데이터
   */
  async getCache(key: string): Promise<any | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const cacheKey = `${this.keyPrefix}cache:${key}`;
      const data = await this.client.get(cacheKey);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Failed to get cache ${key}:`, error);
      return null;
    }
  }

  /**
   * 하트비트 시작
   * 
   * 현재 워커의 상태를 주기적으로 Redis에 업데이트합니다.
   */
  private startHeartbeat(): void {
    const workerId = process.pid.toString();
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const state: WorkerState = {
          id: workerId,
          pid: process.pid,
          status: 'running',
          startTime: Date.now() - (process.uptime() * 1000),
          lastHeartbeat: Date.now(),
          activeConnections: 0, // TODO: 실제 연결 수 구현
          cpuUsage: cpuUsage.user + cpuUsage.system,
          memoryUsage: memUsage.heapUsed,
        };

        await this.setWorkerState(workerId, state);
      } catch (error) {
        console.error('❌ Failed to send heartbeat:', error);
      }
    }, 30000); // 30초마다 하트비트
  }

  /**
   * 연결 상태 확인
   * 
   * @returns {boolean} 연결 상태
   */
  isRedisConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Redis 클라이언트 인스턴스 조회 (고급 사용자용)
   * 
   * @returns {Redis | null} Redis 클라이언트 인스턴스
   */
  getClient(): Redis | null {
    return this.client;
  }
}

// 싱글톤 인스턴스
export const redisService = new RedisService(); 