/**
 * 🔄 재시도 로직 강화 시스템
 * 지수 백오프와 재시도 로직으로 일시적인 실패에 대한 자동 복구
 * 
 * 생성일: 2025년 8월 13일
 * 목적: 에러율 5% → 1% 이하 개선
 */

export interface RetryConfig {
    maxRetries: number;           // 최대 재시도 횟수 (기본값: 3)
    baseDelay: number;            // 기본 지연 시간 (밀리초, 기본값: 1000)
    maxDelay: number;             // 최대 지연 시간 (밀리초, 기본값: 30000)
    backoffMultiplier: number;    // 백오프 승수 (기본값: 2)
    jitter: boolean;              // 지터 적용 여부 (기본값: true)
    retryCondition?: (error: any) => boolean; // 재시도 조건 함수
}

export class RetryLogic {
    private config: RetryConfig;

    constructor(config: Partial<RetryConfig> = {}) {
        this.config = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            jitter: true,
            ...config
        };
    }

    /**
     * 🚀 재시도 로직으로 작업 실행
     */
    async execute<T>(
        operation: () => Promise<T>,
        context?: string
    ): Promise<T> {
        let lastError: any;
        const contextLabel = context ? `[${context}]` : '';

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.calculateDelay(attempt);
                    console.log(`${contextLabel} 🔄 재시도 ${attempt}/${this.config.maxRetries}, ${delay}ms 대기...`);
                    await this.sleep(delay);
                }

                const result = await operation();

                if (attempt > 0) {
                    console.log(`${contextLabel} ✅ 재시도 성공 (${attempt}회 시도)`);
                }

                return result;
            } catch (error) {
                lastError = error;

                if (attempt === this.config.maxRetries) {
                    console.error(`${contextLabel} ❌ 최대 재시도 횟수 초과 (${this.config.maxRetries}회):`, error);
                    break;
                }

                // 재시도 조건 확인
                if (this.config.retryCondition && !this.config.retryCondition(error)) {
                    console.log(`${contextLabel} ⚠️ 재시도 조건 불만족:`, error);
                    break;
                }

                console.warn(`${contextLabel} ⚠️ 작업 실패 (${attempt + 1}/${this.config.maxRetries + 1}):`, error);
            }
        }

        throw lastError;
    }

    /**
     * 🧮 지연 시간 계산 (지수 백오프)
     */
    private calculateDelay(attempt: number): number {
        let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);

        // 최대 지연 시간 제한
        delay = Math.min(delay, this.config.maxDelay);

        // 지터 적용 (네트워크 지터링 효과)
        if (this.config.jitter) {
            const jitterRange = delay * 0.1; // 10% 지터
            delay += (Math.random() - 0.5) * jitterRange;
        }

        return Math.max(delay, 0);
    }

    /**
     * 😴 지연 실행
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 🔧 재시도 조건 설정
     */
    setRetryCondition(condition: (error: any) => boolean): this {
        this.config.retryCondition = condition;
        return this;
    }

    /**
     * 📊 재시도 통계 생성
     */
    static createRetryStats<T>(
        results: Array<{ success: boolean; attempts: number; error?: any }>
    ) {
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const failed = total - successful;
        const avgAttempts = results.reduce((sum, r) => sum + r.attempts, 0) / total;

        return {
            total,
            successful,
            failed,
            successRate: (successful / total) * 100,
            avgAttempts: avgAttempts.toFixed(2),
            errorRate: (failed / total) * 100
        };
    }
}

/**
 * 🏭 재시도 로직 팩토리
 */
export class RetryLogicFactory {
    private static instances = new Map<string, RetryLogic>();

    /**
     * 🔧 재시도 로직 인스턴스 생성 또는 반환
     */
    static getInstance(name: string, config?: Partial<RetryConfig>): RetryLogic {
        if (!this.instances.has(name)) {
            this.instances.set(name, new RetryLogic(config));
            console.log(`🏭 재시도 로직 생성: ${name}`);
        }
        return this.instances.get(name)!;
    }

    /**
     * 📊 모든 재시도 로직 상태 조회
     */
    static getAllInstances(): string[] {
        return Array.from(this.instances.keys());
    }

    /**
     * 🧹 모든 재시도 로직 초기화
     */
    static resetAll(): void {
        this.instances.clear();
        console.log(`🧹 모든 재시도 로직 초기화 완료`);
    }
}

/**
 * 🎯 특화된 재시도 전략들
 */
export class RetryStrategies {
    /**
     * 🌐 네트워크 오류용 재시도 전략
     */
    static networkRetry(): RetryLogic {
        return new RetryLogic({
            maxRetries: 5,
            baseDelay: 2000,
            maxDelay: 60000,
            backoffMultiplier: 2,
            jitter: true,
            retryCondition: (error) => {
                // 네트워크 관련 오류만 재시도
                const networkErrors = [
                    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
                    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'
                ];

                return networkErrors.some(networkError =>
                    error.code === networkError ||
                    error.message?.includes(networkError) ||
                    error.message?.toLowerCase().includes('network') ||
                    error.message?.toLowerCase().includes('timeout')
                );
            }
        });
    }

    /**
     * 🗄️ 데이터베이스 오류용 재시도 전략
     */
    static databaseRetry(): RetryLogic {
        return new RetryLogic({
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 1.5,
            jitter: false,
            retryCondition: (error) => {
                // 데이터베이스 관련 오류만 재시도
                const dbErrors = [
                    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
                    'deadlock', 'lock timeout', 'connection lost'
                ];

                return dbErrors.some(dbError =>
                    error.code === dbError ||
                    error.message?.toLowerCase().includes(dbError)
                );
            }
        });
    }

    /**
     * 🔐 인증 오류용 재시도 전략
     */
    static authRetry(): RetryLogic {
        return new RetryLogic({
            maxRetries: 2,
            baseDelay: 5000,
            maxDelay: 15000,
            backoffMultiplier: 2,
            jitter: true,
            retryCondition: (error) => {
                // 인증 관련 오류만 재시도 (토큰 만료 등)
                const authErrors = [
                    'token expired', 'unauthorized', 'forbidden',
                    'invalid token', 'authentication failed'
                ];

                return authErrors.some(authError =>
                    error.message?.toLowerCase().includes(authError) ||
                    error.status === 401 ||
                    error.status === 403
                );
            }
        });
    }
}
