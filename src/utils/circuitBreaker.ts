/**
 * 🛡️ 서킷 브레이커 패턴 구현
 * 연속 실패 시 자동으로 서킷을 차단하고 복구하는 시스템
 * 
 * 생성일: 2025년 8월 13일
 * 목적: 에러율 5% → 1% 이하 개선
 */

export enum CircuitState {
    CLOSED = 'CLOSED',      // 정상 상태 (요청 허용)
    OPEN = 'OPEN',          // 차단 상태 (요청 거부)
    HALF_OPEN = 'HALF_OPEN' // 반열림 상태 (제한적 요청 허용)
}

export interface CircuitBreakerConfig {
    failureThreshold: number;    // 실패 임계값 (기본값: 5)
    recoveryTimeout: number;     // 복구 대기 시간 (밀리초, 기본값: 60000)
    halfOpenMaxRequests: number; // 반열림 상태에서 허용할 최대 요청 수 (기본값: 3)
    monitorInterval: number;     // 모니터링 간격 (밀리초, 기본값: 10000)
    enableMonitoring: boolean;   // 모니터링 활성화 여부 (기본값: true)
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private successCount: number = 0;
    private totalRequests: number = 0;
    private config: CircuitBreakerConfig;
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = {
            failureThreshold: 5,
            recoveryTimeout: 60000,
            halfOpenMaxRequests: 3,
            monitorInterval: 10000,
            enableMonitoring: true,
            ...config
        };

        // 모니터링이 활성화된 경우에만 타이머 시작
        if (this.config.enableMonitoring) {
            this.monitorInterval = setInterval(() => this.monitorState(), this.config.monitorInterval);
            console.log(`🔄 서킷 브레이커 모니터링 시작 (${this.config.monitorInterval}ms)`);
        } else {
            console.log(`⏸️ 서킷 브레이커 모니터링 비활성화됨`);
        }
    }

    /**
     * 🚀 요청 실행 (서킷 브레이커 적용)
     */
    async execute<T>(
        operation: () => Promise<T>,
        fallback?: () => T | Promise<T>
    ): Promise<T> {
        if (!this.canExecute()) {
            if (fallback) {
                console.log(`🔄 서킷 ${this.state} 상태: 폴백 함수 실행`);
                return await fallback();
            }
            throw new Error(`Circuit breaker is ${this.state}`);
        }

        try {
            this.totalRequests++;
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * 🔍 요청 실행 가능 여부 확인
     */
    private canExecute(): boolean {
        switch (this.state) {
            case CircuitState.CLOSED:
                return true;

            case CircuitState.OPEN:
                if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeout) {
                    console.log(`🔄 서킷 복구 시도: OPEN → HALF_OPEN`);
                    this.state = CircuitState.HALF_OPEN;
                    this.successCount = 0;
                    return true;
                }
                return false;

            case CircuitState.HALF_OPEN:
                return this.successCount < this.config.halfOpenMaxRequests;

            default:
                return false;
        }
    }

    /**
     * ✅ 성공 시 처리
     */
    private onSuccess(): void {
        this.failureCount = 0;
        this.successCount++;

        if (this.state === CircuitState.HALF_OPEN && this.successCount >= this.config.halfOpenMaxRequests) {
            console.log(`✅ 서킷 복구 완료: HALF_OPEN → CLOSED`);
            this.state = CircuitState.CLOSED;
            this.successCount = 0;
        }
    }

    /**
     * ❌ 실패 시 처리
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            console.log(`❌ 서킷 재차단: HALF_OPEN → OPEN`);
            this.state = CircuitState.OPEN;
            this.successCount = 0;
        } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
            console.log(`🚨 서킷 차단: CLOSED → OPEN (실패 ${this.failureCount}회)`);
            this.state = CircuitState.OPEN;
        }
    }

    /**
     * 📊 상태 모니터링
     */
    private monitorState(): void {
        const errorRate = this.totalRequests > 0 ? (this.failureCount / this.totalRequests) * 100 : 0;

        console.log(`📊 서킷 브레이커 상태: ${this.state}, 에러율: ${errorRate.toFixed(2)}%, 총 요청: ${this.totalRequests}, 실패: ${this.failureCount}`);

        // 에러율이 1% 이하로 떨어지면 자동으로 CLOSED 상태로 전환
        if (this.state === CircuitState.OPEN && errorRate <= 1 && this.totalRequests >= 100) {
            console.log(`🎉 에러율 개선 감지 (${errorRate.toFixed(2)}%): 자동으로 CLOSED 상태로 전환`);
            this.state = CircuitState.CLOSED;
            this.failureCount = 0;
        }
    }

    /**
     * 🔧 상태 강제 변경 (테스트용)
     */
    forceState(state: CircuitState): void {
        console.log(`🔧 서킷 상태 강제 변경: ${this.state} → ${state}`);
        this.state = state;

        if (state === CircuitState.CLOSED) {
            this.failureCount = 0;
            this.successCount = 0;
        }
    }

    /**
     * 📈 현재 상태 정보 조회
     */
    getStatus() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            errorRate: this.totalRequests > 0 ? (this.failureCount / this.totalRequests) * 100 : 0,
            lastFailureTime: this.lastFailureTime,
            config: this.config
        };
    }

    /**
     * 🧹 상태 초기화
     */
    reset(): void {
        console.log(`🧹 서킷 브레이커 상태 초기화`);
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
        this.lastFailureTime = 0;
    }

    /**
     * 🧹 리소스 정리 (테스트용)
     */
    cleanup(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            console.log(`🧹 서킷 브레이커 모니터링 정리 완료`);
        }
    }

    /**
     * 🧹 강제 정리 (모든 타이머 제거)
     */
    forceCleanup(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        // 추가 안전장치: 모든 관련 타이머 정리
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
        this.lastFailureTime = 0;
        console.log(`🧹 서킷 브레이커 강제 정리 완료`);
    }
}

/**
 * 🏭 서킷 브레이커 팩토리
 */
export class CircuitBreakerFactory {
    private static instances = new Map<string, CircuitBreaker>();

    /**
     * 🔧 서킷 브레이커 인스턴스 생성 또는 반환
     */
    static getInstance(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
        if (!this.instances.has(name)) {
            this.instances.set(name, new CircuitBreaker(config));
            console.log(`🏭 서킷 브레이커 생성: ${name}`);
        }
        return this.instances.get(name)!;
    }

    /**
     * 📊 모든 서킷 브레이커 상태 조회
     */
    static getAllStatuses(): Record<string, ReturnType<CircuitBreaker['getStatus']>> {
        const statuses: Record<string, ReturnType<CircuitBreaker['getStatus']>> = {};
        for (const [name, instance] of this.instances) {
            statuses[name] = instance.getStatus();
        }
        return statuses;
    }

    /**
     * 🧹 모든 서킷 브레이커 초기화
     */
    static resetAll(): void {
        for (const instance of this.instances.values()) {
            instance.reset();
        }
        console.log(`🧹 모든 서킷 브레이커 초기화 완료`);
    }

    /**
     * 🧹 모든 서킷 브레이커 리소스 정리 (테스트용)
     */
    static cleanupAll(): void {
        for (const instance of this.instances.values()) {
            instance.forceCleanup();
        }
        console.log(`🧹 모든 서킷 브레이커 리소스 정리 완료`);
    }
}
