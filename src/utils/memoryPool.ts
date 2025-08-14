/**
 * 🧠 메모리 풀링 시스템
 * 객체 재사용으로 가비지 컬렉션 최소화 및 성능 향상
 * 
 * 생성일: 2025년 8월 13일
 * 목적: AI 시스템 347배 성능 향상 달성
 */

export interface PoolConfig<T> {
    initialSize: number;          // 초기 풀 크기 (기본값: 100)
    maxSize: number;              // 최대 풀 크기 (기본값: 1000)
    growFactor: number;           // 성장 계수 (기본값: 2)
    shrinkFactor: number;         // 축소 계수 (기본값: 0.5)
    shrinkThreshold: number;      // 축소 임계값 (기본값: 0.3)
    cleanupInterval: number;      // 정리 간격 (밀리초, 기본값: 30000)
    objectFactory: () => T;       // 객체 생성 팩토리
    objectReset?: (obj: T) => void; // 객체 초기화 함수
    objectValidate?: (obj: T) => boolean; // 객체 유효성 검사 함수
}

export class MemoryPool<T> {
    private pool: T[] = [];
    private inUse: Set<T> = new Set();
    private config: PoolConfig<T>;
    private stats = {
        totalCreated: 0,
        totalReused: 0,
        totalDiscarded: 0,
        currentPoolSize: 0,
        currentInUse: 0
    };

    constructor(config: PoolConfig<T>) {
        this.config = config;

        // 초기 풀 생성
        this.growPool(config.initialSize);

        // 주기적 정리
        setInterval(() => this.cleanup(), config.cleanupInterval);

        console.log(`🧠 메모리 풀 생성: ${config.initialSize}개 초기 객체`);
    }

    /**
     * 🚀 객체 획득 (풀에서 가져오거나 새로 생성)
     */
    acquire(): T {
        let obj: T;

        if (this.pool.length > 0) {
            obj = this.pool.pop()!;
            this.stats.totalReused++;
            console.log(`♻️ 메모리 풀에서 객체 재사용 (남은 풀: ${this.pool.length})`);
        } else {
            obj = this.config.objectFactory();
            this.stats.totalCreated++;
            console.log(`🆕 새 객체 생성 (총 생성: ${this.stats.totalCreated})`);
        }

        this.inUse.add(obj);
        this.stats.currentInUse = this.inUse.size;
        this.stats.currentPoolSize = this.pool.length;

        return obj;
    }

    /**
     * 🔄 객체 반환 (풀로 되돌리기)
     */
    release(obj: T): void {
        if (!this.inUse.has(obj)) {
            console.warn(`⚠️ 사용 중이지 않은 객체 반환 시도`);
            return;
        }

        this.inUse.delete(obj);

        // 객체 유효성 검사
        if (this.config.objectValidate && !this.config.objectValidate(obj)) {
            this.stats.totalDiscarded++;
            console.log(`🗑️ 유효하지 않은 객체 폐기 (총 폐기: ${this.stats.totalDiscarded})`);
            return;
        }

        // 객체 초기화
        if (this.config.objectReset) {
            this.config.objectReset(obj);
        }

        // 풀에 반환
        if (this.pool.length < this.config.maxSize) {
            this.pool.push(obj);
            console.log(`🔄 객체 풀에 반환 (현재 풀: ${this.pool.length})`);
        } else {
            this.stats.totalDiscarded++;
            console.log(`🗑️ 풀 가득참으로 객체 폐기 (총 폐기: ${this.stats.totalDiscarded})`);
        }

        this.stats.currentInUse = this.inUse.size;
        this.stats.currentPoolSize = this.pool.length;
    }

    /**
     * 📈 풀 크기 증가
     */
    private growPool(count: number): void {
        const newSize = Math.min(
            this.pool.length + count,
            this.config.maxSize
        );

        for (let i = this.pool.length; i < newSize; i++) {
            this.pool.push(this.config.objectFactory());
        }

        console.log(`📈 메모리 풀 확장: ${this.pool.length}개 객체`);
    }

    /**
     * 📉 풀 크기 축소
     */
    private shrinkPool(): void {
        const targetSize = Math.floor(this.pool.length * this.config.shrinkFactor);
        const currentInUse = this.inUse.size;

        if (this.pool.length > targetSize && currentInUse < this.pool.length * this.config.shrinkThreshold) {
            const removeCount = this.pool.length - targetSize;
            this.pool.splice(0, removeCount);
            console.log(`📉 메모리 풀 축소: ${removeCount}개 객체 제거 (현재: ${this.pool.length})`);
        }
    }

    /**
     * 🧹 주기적 정리
     */
    private cleanup(): void {
        this.shrinkPool();

        // 통계 로깅
        const utilization = this.stats.currentInUse / (this.stats.currentInUse + this.stats.currentPoolSize);
        console.log(`📊 메모리 풀 상태: 사용률 ${(utilization * 100).toFixed(1)}%, 풀: ${this.stats.currentPoolSize}, 사용중: ${this.stats.currentInUse}`);
    }

    /**
     * 📊 풀 상태 조회
     */
    getStatus() {
        return {
            ...this.stats,
            poolSize: this.pool.length,
            inUseCount: this.inUse.size,
            utilization: this.inUse.size / (this.inUse.size + this.pool.length)
        };
    }

    /**
     * 🧹 풀 초기화
     */
    reset(): void {
        this.pool = [];
        this.inUse.clear();
        this.stats = {
            totalCreated: 0,
            totalReused: 0,
            totalDiscarded: 0,
            currentPoolSize: 0,
            currentInUse: 0
        };
        console.log(`🧹 메모리 풀 초기화 완료`);
    }

    /**
     * 🔧 풀 크기 조정
     */
    resize(newSize: number): void {
        if (newSize < this.inUse.size) {
            throw new Error(`새 크기(${newSize})가 사용 중인 객체 수(${this.inUse.size})보다 작습니다.`);
        }

        if (newSize > this.config.maxSize) {
            this.config.maxSize = newSize;
        }

        if (newSize > this.pool.length) {
            this.growPool(newSize - this.pool.length);
        } else if (newSize < this.pool.length) {
            const removeCount = this.pool.length - newSize;
            this.pool.splice(0, removeCount);
        }

        console.log(`🔧 메모리 풀 크기 조정: ${newSize}개`);
    }
}

/**
 * 🏭 메모리 풀 팩토리
 */
export class MemoryPoolFactory {
    private static pools = new Map<string, MemoryPool<any>>();

    /**
     * 🔧 메모리 풀 생성 또는 반환
     */
    static getPool<T>(name: string, config: PoolConfig<T>): MemoryPool<T> {
        if (!this.pools.has(name)) {
            this.pools.set(name, new MemoryPool(config));
            console.log(`🏭 메모리 풀 생성: ${name}`);
        }
        return this.pools.get(name)!;
    }

    /**
     * 📊 모든 풀 상태 조회
     */
    static getAllPoolStatuses(): Record<string, any> {
        const statuses: Record<string, any> = {};
        for (const [name, pool] of this.pools) {
            statuses[name] = pool.getStatus();
        }
        return statuses;
    }

    /**
     * 🧹 모든 풀 초기화
     */
    static resetAllPools(): void {
        for (const pool of this.pools.values()) {
            pool.reset();
        }
        console.log(`🧹 모든 메모리 풀 초기화 완료`);
    }
}

/**
 * 🎯 특화된 메모리 풀들
 */
export class SpecializedPools {
    /**
     * 🧠 AI 매칭 결과 풀
     */
    static createMatchingResultPool() {
        return MemoryPoolFactory.getPool('matching-result', {
            initialSize: 200,
            maxSize: 2000,
            growFactor: 2,
            shrinkFactor: 0.5,
            shrinkThreshold: 0.3,
            cleanupInterval: 30000,
            objectFactory: () => ({
                server: null,
                score: 0,
                confidence: 0,
                matchedFeatures: [],
                matchingReason: ''
            }),
            objectReset: (obj) => {
                obj.server = null;
                obj.score = 0;
                obj.confidence = 0;
                obj.matchedFeatures = [];
                obj.matchingReason = '';
            },
            objectValidate: (obj) => obj !== null && typeof obj === 'object'
        });
    }

    /**
     * 📊 성능 메트릭 풀
     */
    static createPerformanceMetricsPool() {
        return MemoryPoolFactory.getPool('performance-metrics', {
            initialSize: 100,
            maxSize: 1000,
            growFactor: 2,
            shrinkFactor: 0.5,
            shrinkThreshold: 0.3,
            cleanupInterval: 30000,
            objectFactory: () => ({
                cpuUsage: 0,
                memoryUsage: 0,
                networkLatency: 0,
                errorRate: 0,
                timestamp: Date.now()
            }),
            objectReset: (obj) => {
                obj.cpuUsage = 0;
                obj.memoryUsage = 0;
                obj.networkLatency = 0;
                obj.errorRate = 0;
                obj.timestamp = Date.now();
            },
            objectValidate: (obj) => obj !== null && typeof obj === 'object' && typeof obj.timestamp === 'number'
        });
    }
}
