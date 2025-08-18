/**
 * 🛡️ 서킷 브레이커 테스트
 * 에러율 개선 시스템 검증
 * 
 * 생성일: 2025년 8월 13일
 */

import { CircuitBreaker, CircuitBreakerFactory, CircuitState } from '../circuitBreaker.js';

describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
        // 이전 테스트의 타이머 정리
        jest.clearAllTimers();
        circuitBreaker = new CircuitBreaker({
            failureThreshold: 3,
            recoveryTimeout: 1000,
            halfOpenMaxRequests: 2,
            enableMonitoring: false  // 테스트에서는 모니터링 비활성화
        });
    });

    afterEach(() => {
        circuitBreaker.forceCleanup();
    });

    afterAll(() => {
        // 모든 테스트 완료 후 전역 정리
        CircuitBreakerFactory.cleanupAll(); // 모든 서킷 브레이커 리소스 정리
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    // 모니터링이 비활성화된 상태에서도 상태 전환 테스트
    test('✅ 모니터링 비활성화 상태에서 상태 전환 테스트', () => {
        expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);

        // 강제로 상태 변경
        circuitBreaker.forceState(CircuitState.OPEN);
        expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);

        circuitBreaker.forceState(CircuitState.HALF_OPEN);
        expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN);

        circuitBreaker.forceState(CircuitState.CLOSED);
        expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
    });

    describe('기본 기능 테스트', () => {
        test('✅ 서킷 브레이커 인스턴스 생성', () => {
            expect(circuitBreaker).toBeInstanceOf(CircuitBreaker);
            expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
        });

        test('✅ 기본 설정값 적용 확인', () => {
            const status = circuitBreaker.getStatus();
            expect(status.config.failureThreshold).toBe(3);
            expect(status.config.recoveryTimeout).toBe(1000);
            expect(status.config.halfOpenMaxRequests).toBe(2);
            expect(status.config.enableMonitoring).toBe(false); // 모니터링 비활성화 확인
            console.log(`🔍 테스트 설정 확인: enableMonitoring = ${status.config.enableMonitoring}`);
        });
    });

    describe('서킷 상태 전환 테스트', () => {
        test('✅ CLOSED → OPEN 전환 (연속 실패)', async () => {
            const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'));

            // 3번 연속 실패로 OPEN 상태 전환
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(failingOperation);
                } catch (error) {
                    // 에러는 예상됨
                }
            }

            expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);
            expect(circuitBreaker.getStatus().failureCount).toBe(3);
        });

        test('✅ OPEN → HALF_OPEN 전환 (복구 시간 경과)', async () => {
            // 먼저 OPEN 상태로 전환
            const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'));
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(failingOperation);
                } catch (error) {
                    // 에러는 예상됨
                }
            }

            expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);

            // 복구 시간 대기
            await new Promise(resolve => setTimeout(resolve, 1100));

            // HALF_OPEN 상태로 전환되어야 함
            expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN);
        });

        test('✅ HALF_OPEN → CLOSED 전환 (성공)', async () => {
            // HALF_OPEN 상태로 강제 전환
            circuitBreaker.forceState(CircuitState.HALF_OPEN);

            const successfulOperation = jest.fn().mockResolvedValue('success');

            // 성공적인 요청 2번 실행
            for (let i = 0; i < 2; i++) {
                await circuitBreaker.execute(successfulOperation);
            }

            expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
        });
    });

    describe('폴백 함수 테스트', () => {
        test('✅ OPEN 상태에서 폴백 함수 실행', async () => {
            // OPEN 상태로 강제 전환
            circuitBreaker.forceState(CircuitState.OPEN);

            const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'));
            const fallbackOperation = jest.fn().mockResolvedValue('fallback result');

            // 폴백 함수와 함께 실행
            const result = await circuitBreaker.execute(failingOperation, fallbackOperation);

            expect(result).toBe('fallback result');
            expect(fallbackOperation).toHaveBeenCalled();
            expect(failingOperation).not.toHaveBeenCalled(); // OPEN 상태에서는 실행되지 않음
        });
    });

    describe('에러율 모니터링 테스트', () => {
        test('✅ 에러율 1% 이하 시 자동 CLOSED 전환', async () => {
            // 많은 요청으로 에러율 계산
            const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'));
            const successfulOperation = jest.fn().mockResolvedValue('success');

            // 100번 요청 중 1번만 실패 (에러율 1%)
            for (let i = 0; i < 99; i++) {
                await circuitBreaker.execute(successfulOperation);
            }

            // 마지막에 1번 실패
            try {
                await circuitBreaker.execute(failingOperation);
            } catch (error) {
                // 에러는 예상됨
            }

            // 에러율이 1% 이하이므로 CLOSED 상태 유지
            expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
            expect(circuitBreaker.getStatus().errorRate).toBeLessThanOrEqual(1);
        });
    });

    describe('통합 테스트', () => {
        test('✅ 전체 서킷 브레이커 워크플로우', async () => {
            const failingOperation = jest.fn().mockRejectedValue(new Error('Test error'));
            const successfulOperation = jest.fn().mockResolvedValue('success');

            // 1. CLOSED 상태에서 시작
            expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);

            // 2. 연속 실패로 OPEN 상태 전환
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(failingOperation);
                } catch (error) {
                    // 에러는 예상됨
                }
            }
            expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);

            // 3. 복구 시간 대기 후 HALF_OPEN 전환
            await new Promise(resolve => setTimeout(resolve, 1100));
            expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN);

            // 4. 성공으로 CLOSED 상태 복구
            for (let i = 0; i < 2; i++) {
                await circuitBreaker.execute(successfulOperation);
            }
            expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
        });
    });
});

describe('CircuitBreakerFactory', () => {
    afterEach(() => {
        CircuitBreakerFactory.resetAll();
        CircuitBreakerFactory.cleanupAll(); // 모든 리소스 정리
    });

    afterAll(() => {
        // 모든 테스트 완료 후 전역 정리
        CircuitBreakerFactory.cleanupAll(); // 모든 서킷 브레이커 리소스 정리
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    test('✅ 팩토리에서 인스턴스 생성 및 반환', () => {
        const instance1 = CircuitBreakerFactory.getInstance('test-circuit-1');
        const instance2 = CircuitBreakerFactory.getInstance('test-circuit-1');
        const instance3 = CircuitBreakerFactory.getInstance('test-circuit-2');

        expect(instance1).toBe(instance2); // 같은 이름은 같은 인스턴스
        expect(instance1).not.toBe(instance3); // 다른 이름은 다른 인스턴스
    });

    test('✅ 모든 서킷 브레이커 상태 조회', () => {
        // 기존 인스턴스 정리
        CircuitBreakerFactory.cleanupAll();

        CircuitBreakerFactory.getInstance('test-1');
        CircuitBreakerFactory.getInstance('test-2');

        const statuses = CircuitBreakerFactory.getAllStatuses();
        expect(Object.keys(statuses)).toHaveLength(2);
        expect(statuses['test-1']).toBeDefined();
        expect(statuses['test-2']).toBeDefined();
    });
});
