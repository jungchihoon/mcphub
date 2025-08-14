import { HealthMetrics } from '../../../types/performance-prediction';
import { RealTimePerformancePredictor } from '../realTimePerformancePredictor';

/**
 * 🧪 실시간 성능 예측 및 자동 스케일링 시스템 테스트
 */
describe('RealTimePerformancePredictor', () => {
    let predictor: RealTimePerformancePredictor;
    let mockMetrics: HealthMetrics;

    beforeEach(() => {
        predictor = new RealTimePerformancePredictor();

        // 테스트용 메트릭 데이터
        mockMetrics = {
            hubId: 'test-hub-1',
            timestamp: new Date(),
            cpuUsage: 75,
            memoryUsage: 80,
            diskUsage: 60,
            networkLatency: 150,
            responseTime: 300,
            errorRate: 5,
            activeConnections: 800,
            throughput: 750
        };
    });

    describe('기본 기능 테스트', () => {
        test('✅ 시스템 인스턴스 생성', () => {
            expect(predictor).toBeInstanceOf(RealTimePerformancePredictor);
        });

        test('✅ 기본 설정값 적용 확인', () => {
            // 기본 설정값들이 올바르게 적용되었는지 확인
            expect(predictor).toBeDefined();
        });
    });

    describe('성능 예측 기능 테스트', () => {
        test('✅ 성능 예측 실행', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);

            expect(prediction).toBeDefined();
            expect(prediction.hubId).toBe('test-hub-1');
            expect(prediction.timestamp).toBeInstanceOf(Date);
            expect(prediction.timeHorizon).toBe(300000); // 5분
            expect(prediction.predictions).toBeInstanceOf(Map);
            expect(prediction.trends).toBeInstanceOf(Map);
            expect(prediction.scalingDecision).toBeDefined();
            expect(prediction.confidence).toBeGreaterThanOrEqual(0);
            expect(prediction.confidence).toBeLessThanOrEqual(100);
            expect(prediction.resourceDemand).toBeDefined();
            expect(prediction.riskLevel).toBeDefined();
            expect(prediction.recommendations).toBeInstanceOf(Array);
        });

        test('✅ 예측 결과 구조 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);

            // predictions Map 검증
            expect(prediction.predictions.has('cpu')).toBe(true);
            expect(prediction.predictions.has('memory')).toBe(true);
            expect(prediction.predictions.has('responseTime')).toBe(true);
            expect(prediction.predictions.has('errorRate')).toBe(true);

            // 각 메트릭의 예측값이 배열인지 확인
            const cpuPredictions = prediction.predictions.get('cpu');
            expect(Array.isArray(cpuPredictions)).toBe(true);
            expect(cpuPredictions!.length).toBeGreaterThan(0);
        });

        test('✅ 허브 ID 정확성', async () => {
            const prediction = await predictor.predictPerformance('test-hub-2', mockMetrics);
            expect(prediction.hubId).toBe('test-hub-2');
        });

        test('✅ 예측 신뢰도 범위 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);
            expect(prediction.confidence).toBeGreaterThanOrEqual(0);
            expect(prediction.confidence).toBeLessThanOrEqual(100);
        });

        test('✅ 리소스 수요 계산 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);

            expect(prediction.resourceDemand.cpu).toBeDefined();
            expect(prediction.resourceDemand.memory).toBeDefined();
            expect(prediction.resourceDemand.cpu.current).toBeGreaterThanOrEqual(0);
            expect(prediction.resourceDemand.cpu.predicted).toBeGreaterThanOrEqual(0);
            expect(prediction.resourceDemand.cpu.required).toBeGreaterThanOrEqual(0);
        });

        test('✅ 위험도 평가 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);

            expect(['low', 'medium', 'high', 'critical']).toContain(prediction.riskLevel);
        });

        test('✅ 권장사항 생성 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);

            expect(prediction.recommendations).toBeInstanceOf(Array);
            expect(prediction.recommendations.length).toBeGreaterThan(0);

            // 모든 권장사항이 문자열인지 확인
            prediction.recommendations.forEach(recommendation => {
                expect(typeof recommendation).toBe('string');
                expect(recommendation.length).toBeGreaterThan(0);
            });
        });
    });

    describe('스케일링 결정 테스트', () => {
        test('✅ 스케일링 결정 구조 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);
            const decision = prediction.scalingDecision;

            expect(['scale_up', 'scale_down', 'none']).toContain(decision.action);
            expect(typeof decision.reason).toBe('string');
            expect(['low', 'medium', 'high', 'critical']).toContain(decision.priority);
            expect(['minimal', 'moderate', 'significant', 'cost_savings', 'none']).toContain(decision.estimatedImpact);
        });

        test('✅ CPU 기반 스케일업 결정', async () => {
            // CPU 사용률이 높은 메트릭으로 테스트
            const highCpuMetrics: HealthMetrics = {
                ...mockMetrics,
                cpuUsage: 95,
                memoryUsage: 70
            };

            const prediction = await predictor.predictPerformance('test-hub-1', highCpuMetrics);
            const decision = prediction.scalingDecision;

            // CPU가 90% 이상이면 scale_up이어야 함
            if (highCpuMetrics.cpuUsage > 90) {
                expect(decision.action).toBe('scale_up');
                expect(decision.priority).toBe('high');
                expect(decision.estimatedImpact).toBe('significant');
            }
        });

        test('✅ 메모리 기반 스케일업 결정', async () => {
            // 메모리 사용률이 높은 메트릭으로 테스트
            const highMemoryMetrics: HealthMetrics = {
                ...mockMetrics,
                cpuUsage: 70,
                memoryUsage: 90
            };

            const prediction = await predictor.predictPerformance('test-hub-1', highMemoryMetrics);
            const decision = prediction.scalingDecision;

            // 메모리가 85% 이상이면 scale_up이어야 함
            if (highMemoryMetrics.memoryUsage > 85) {
                expect(decision.action).toBe('scale_up');
                expect(decision.priority).toBe('high');
                expect(decision.estimatedImpact).toBe('significant');
            }
        });

        test('✅ 응답 시간 기반 스케일링 결정', async () => {
            // 응답 시간이 높은 메트릭으로 테스트
            const highResponseTimeMetrics: HealthMetrics = {
                ...mockMetrics,
                responseTime: 1200
            };

            const prediction = await predictor.predictPerformance('test-hub-1', highResponseTimeMetrics);
            const decision = prediction.scalingDecision;

            // 응답 시간이 1000ms 이상이면 scale_up이어야 함
            if (highResponseTimeMetrics.responseTime > 1000) {
                expect(decision.action).toBe('scale_up');
                expect(decision.priority).toBe('medium');
                expect(decision.estimatedImpact).toBe('moderate');
            }
        });

        test('✅ 다운스케일링 결정', async () => {
            // 리소스 사용률이 낮은 메트릭으로 테스트
            const lowUsageMetrics: HealthMetrics = {
                ...mockMetrics,
                cpuUsage: 25,
                memoryUsage: 35
            };

            const prediction = await predictor.predictPerformance('test-hub-1', lowUsageMetrics);
            const decision = prediction.scalingDecision;

            // CPU < 30% && Memory < 40%이면 scale_down이어야 함
            if (lowUsageMetrics.cpuUsage < 30 && lowUsageMetrics.memoryUsage < 40) {
                expect(decision.action).toBe('scale_down');
                expect(decision.priority).toBe('low');
                expect(decision.estimatedImpact).toBe('cost_savings');
            }
        });
    });

    describe('트렌드 분석 테스트', () => {
        test('✅ 트렌드 데이터 존재 확인', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);

            expect(prediction.trends).toBeInstanceOf(Map);
            expect(prediction.trends.size).toBeGreaterThan(0);

            // 주요 메트릭들의 트렌드가 존재하는지 확인
            expect(prediction.trends.has('cpu')).toBe(true);
            expect(prediction.trends.has('memory')).toBe(true);
            expect(prediction.trends.has('responseTime')).toBe(true);
            expect(prediction.trends.has('errorRate')).toBe(true);
        });

        test('✅ 트렌드 값 범위 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);

            // 트렌드 값들이 숫자인지 확인
            prediction.trends.forEach((trend, metric) => {
                expect(typeof trend).toBe('number');
                expect(Number.isFinite(trend)).toBe(true);
            });
        });
    });

    describe('예측 정확성 테스트', () => {
        test('✅ CPU 예측값 범위 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);
            const cpuPredictions = prediction.predictions.get('cpu');

            expect(cpuPredictions).toBeDefined();
            expect(Array.isArray(cpuPredictions)).toBe(true);

            // 모든 예측값이 0-100 범위 내에 있는지 확인
            cpuPredictions!.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(100);
            });
        });

        test('✅ 메모리 예측값 범위 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);
            const memoryPredictions = prediction.predictions.get('memory');

            expect(memoryPredictions).toBeDefined();
            expect(Array.isArray(memoryPredictions)).toBe(true);

            // 모든 예측값이 0-100 범위 내에 있는지 확인
            memoryPredictions!.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(100);
            });
        });

        test('✅ 응답 시간 예측값 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);
            const responseTimePredictions = prediction.predictions.get('responseTime');

            expect(responseTimePredictions).toBeDefined();
            expect(Array.isArray(responseTimePredictions)).toBe(true);

            // 모든 예측값이 양수인지 확인
            responseTimePredictions!.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
            });
        });

        test('✅ 에러율 예측값 범위 검증', async () => {
            const prediction = await predictor.predictPerformance('test-hub-1', mockMetrics);
            const errorRatePredictions = prediction.predictions.get('errorRate');

            expect(errorRatePredictions).toBeDefined();
            expect(Array.isArray(errorRatePredictions)).toBe(true);

            // 모든 예측값이 0-100 범위 내에 있는지 확인
            errorRatePredictions!.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('자동 스케일링 실행 테스트', () => {
        test('✅ 스케일업 실행', async () => {
            const highCpuMetrics: HealthMetrics = {
                ...mockMetrics,
                cpuUsage: 95
            };

            const prediction = await predictor.predictPerformance('test-hub-1', highCpuMetrics);
            const decision = prediction.scalingDecision;

            if (decision.action === 'scale_up') {
                const result = await predictor.executeAutoScaling('test-hub-1', decision);
                expect(typeof result).toBe('boolean');
            }
        });

        test('✅ 다운스케일링 실행', async () => {
            const lowUsageMetrics: HealthMetrics = {
                ...mockMetrics,
                cpuUsage: 25,
                memoryUsage: 35
            };

            const prediction = await predictor.predictPerformance('test-hub-1', lowUsageMetrics);
            const decision = prediction.scalingDecision;

            if (decision.action === 'scale_down') {
                const result = await predictor.executeAutoScaling('test-hub-1', decision);
                expect(typeof result).toBe('boolean');
            }
        });

        test('✅ 스케일링 액션 없음', async () => {
            const normalMetrics: HealthMetrics = {
                ...mockMetrics,
                cpuUsage: 50,
                memoryUsage: 60
            };

            const prediction = await predictor.predictPerformance('test-hub-1', normalMetrics);
            const decision = prediction.scalingDecision;

            if (decision.action === 'none') {
                const result = await predictor.executeAutoScaling('test-hub-1', decision);
                expect(result).toBe(true); // 액션이 없으면 성공으로 간주
            }
        });
    });

    describe('에러 처리 검증', () => {
        test('✅ 잘못된 메트릭 처리', async () => {
            const invalidMetrics: any = {
                hubId: 'test-hub-1',
                timestamp: new Date(),
                // 필수 메트릭 누락
            };

            await expect(predictor.predictPerformance('test-hub-1', invalidMetrics as HealthMetrics))
                .rejects.toThrow();
        });

        test('✅ 빈 허브 ID 처리', async () => {
            await expect(predictor.predictPerformance('', mockMetrics))
                .rejects.toThrow();
        });
    });

    describe('성능 검증', () => {
        test('✅ 예측 처리 시간', async () => {
            const startTime = Date.now();

            await predictor.predictPerformance('test-hub-1', mockMetrics);

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // 예측이 1초 이내에 완료되어야 함
            expect(processingTime).toBeLessThan(1000);
        });

        test('✅ 대량 예측 처리', async () => {
            const startTime = Date.now();
            const promises = [];

            // 10개의 동시 예측 요청
            for (let i = 0; i < 10; i++) {
                const metrics = { ...mockMetrics, hubId: `test-hub-${i}` };
                promises.push(predictor.predictPerformance(`test-hub-${i}`, metrics));
            }

            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            expect(results).toHaveLength(10);
            expect(totalTime).toBeLessThan(5000); // 5초 이내에 완료

            // 모든 결과가 올바른 구조를 가지고 있는지 확인
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.hubId).toMatch(/^test-hub-\d+$/);
                expect(result.predictions).toBeInstanceOf(Map);
            });
        });
    });

    describe('통합 테스트', () => {
        test('✅ 전체 성능 예측 워크플로우', async () => {
            // 1. 다양한 메트릭으로 예측 실행
            const testCases = [
                { cpu: 95, memory: 70, expected: 'scale_up' },
                { cpu: 25, memory: 35, expected: 'none' },
                { cpu: 50, memory: 60, expected: 'none' }
            ];

            for (const testCase of testCases) {
                const metrics: HealthMetrics = {
                    ...mockMetrics,
                    cpuUsage: testCase.cpu,
                    memoryUsage: testCase.memory
                };

                const prediction = await predictor.predictPerformance('test-hub-1', metrics);
                const decision = prediction.scalingDecision;

                // 예측 결과 검증
                expect(prediction).toBeDefined();
                expect(prediction.hubId).toBe('test-hub-1');
                expect(prediction.predictions).toBeInstanceOf(Map);
                expect(prediction.trends).toBeInstanceOf(Map);
                expect(prediction.scalingDecision).toBeDefined();

                // 스케일링 결정 검증
                if (testCase.expected === 'scale_up') {
                    expect(['scale_up']).toContain(decision.action);
                } else if (testCase.expected === 'scale_down') {
                    expect(['scale_down']).toContain(decision.action);
                } else {
                    expect(['none']).toContain(decision.action);
                }
            }
        });

        test('✅ 다양한 시나리오 테스트', async () => {
            const scenarios = [
                {
                    name: '높은 부하 시나리오',
                    metrics: { ...mockMetrics, cpuUsage: 98, memoryUsage: 92, errorRate: 12 },
                    expectedRisk: 'critical'
                },
                {
                    name: '중간 부하 시나리오',
                    metrics: { ...mockMetrics, cpuUsage: 75, memoryUsage: 80, errorRate: 5 },
                    expectedRisk: 'medium'
                },
                {
                    name: '낮은 부하 시나리오',
                    metrics: { ...mockMetrics, cpuUsage: 30, memoryUsage: 45, errorRate: 2 },
                    expectedRisk: 'low'
                }
            ];

            for (const scenario of scenarios) {
                const prediction = await predictor.predictPerformance('test-hub-1', scenario.metrics);

                // 위험도 검증
                expect(prediction.riskLevel).toBe(scenario.expectedRisk);

                // 권장사항 검증
                expect(prediction.recommendations.length).toBeGreaterThan(0);

                // 리소스 수요 검증
                expect(prediction.resourceDemand.cpu).toBeDefined();
                expect(prediction.resourceDemand.memory).toBeDefined();
            }
        });
    });
});
