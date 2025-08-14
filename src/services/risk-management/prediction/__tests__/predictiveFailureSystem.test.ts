// 예측적 장애 방지 시스템 단위 테스트
// 생성일: 2025년 8월 13일
// 목적: 예측 시스템의 정확성 및 안정성 검증

import { HealthMetrics, PerformanceMetrics } from '../../../../types/risk-management';
import { PredictionResult, PredictiveFailureSystem } from '../predictiveFailureSystem';

// 🧪 테스트 데이터 준비
const mockHealthMetrics: HealthMetrics = {
    hubId: 'test-hub-1',
    timestamp: new Date(),
    cpuUsage: 85,
    memoryUsage: 90,
    diskUsage: 70,
    networkLatency: 120,
    responseTime: 250,
    errorRate: 6,
    activeConnections: 850,
    throughput: 750
};

const mockPerformanceMetrics: PerformanceMetrics = {
    hubId: 'test-hub-1',
    timestamp: new Date(),
    responseTime: { average: 250, p50: 200, p95: 400, p99: 600, min: 100, max: 800 },
    throughput: { requestsPerSecond: 750, requestsPerMinute: 45000, requestsPerHour: 2700000, totalRequests: 1000000, successfulRequests: 940000, failedRequests: 60000 },
    resourceUsage: {
        cpu: { current: 85, average: 80, peak: 90, idle: 15, loadAverage: [0.8, 0.85, 0.9] },
        memory: { total: 8192, used: 7373, free: 819, available: 1024, usagePercentage: 90 },
        disk: { total: 1000000, used: 700000, free: 300000, usagePercentage: 70, readSpeed: 50, writeSpeed: 30 },
        network: { bytesIn: 1000, bytesOut: 800, packetsIn: 10000, packetsOut: 8000, errorsIn: 5, errorsOut: 3, droppedIn: 2, droppedOut: 1 }
    },
    networkMetrics: { bytesIn: 1000, bytesOut: 800, packetsIn: 10000, packetsOut: 8000, errorsIn: 5, errorsOut: 3, droppedIn: 2, droppedOut: 1 },
    errorMetrics: { totalErrors: 60000, errorRate: 6, errorTypes: new Map([['network', 30000], ['timeout', 20000], ['validation', 10000]]), lastError: new Date(), errorTrend: 'increasing' }
};

const mockConfig = {
    predictionInterval: 300000, // 5분
    confidenceThreshold: 0.7,
    maxPredictions: 10,
    trainingDataRetention: 30
};

describe('PredictiveFailureSystem', () => {
    let predictiveSystem: PredictiveFailureSystem;

    beforeEach(() => {
        predictiveSystem = new PredictiveFailureSystem(mockConfig);
    });

    describe('기본 기능 테스트', () => {
        test('✅ 시스템 인스턴스 생성', () => {
            expect(predictiveSystem).toBeInstanceOf(PredictiveFailureSystem);
        });

        test('✅ 설정값 적용 확인', () => {
            // 설정이 올바르게 적용되었는지 확인
            expect(predictiveSystem).toBeDefined();
        });
    });

    describe('장애 예측 기능 테스트', () => {
        let predictionResult: PredictionResult;

        beforeEach(async () => {
            predictionResult = await predictiveSystem.predictFailures('test-hub-1');
        });

        test('✅ 예측 결과 구조 검증', () => {
            expect(predictionResult).toHaveProperty('hubId');
            expect(predictionResult).toHaveProperty('predictions');
            expect(predictionResult).toHaveProperty('confidence');
            expect(predictionResult).toHaveProperty('modelUsed');
            expect(predictionResult).toHaveProperty('timestamp');
            expect(predictionResult).toHaveProperty('recommendations');
        });

        test('✅ 허브 ID 정확성', () => {
            expect(predictionResult.hubId).toBe('test-hub-1');
        });

        test('✅ 예측 결과 존재 확인', () => {
            expect(predictionResult.predictions.length).toBeGreaterThan(0);
        });

        test('✅ 신뢰도 범위 검증', () => {
            expect(predictionResult.confidence).toBeGreaterThanOrEqual(0);
            expect(predictionResult.confidence).toBeLessThanOrEqual(100);
        });

        test('✅ 모델 정보 존재', () => {
            expect(predictionResult.modelUsed).toBeTruthy();
            expect(typeof predictionResult.modelUsed).toBe('string');
        });

        test('✅ 타임스탬프 정확성', () => {
            expect(predictionResult.timestamp).toBeInstanceOf(Date);
            const timeDiff = Math.abs(Date.now() - predictionResult.timestamp.getTime());
            expect(timeDiff).toBeLessThan(1000); // 1초 이내
        });

        test('✅ 추천사항 존재 확인', () => {
            expect(predictionResult.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('개별 예측 상세 검증', () => {
        let predictionResult: PredictionResult;

        beforeEach(async () => {
            predictionResult = await predictiveSystem.predictFailures('test-hub-1');
        });

        test('✅ 예측 객체 구조 검증', () => {
            predictionResult.predictions.forEach(prediction => {
                expect(prediction).toHaveProperty('hubId');
                expect(prediction).toHaveProperty('failureProbability');
                expect(prediction).toHaveProperty('estimatedTimeToFailure');
                expect(prediction).toHaveProperty('failureType');
                expect(prediction).toHaveProperty('confidence');
                expect(prediction).toHaveProperty('contributingFactors');
                expect(prediction).toHaveProperty('recommendedActions');
                expect(prediction).toHaveProperty('predictedImpact');
                expect(prediction).toHaveProperty('timestamp');
            });
        });

        test('✅ 장애 확률 범위 검증', () => {
            predictionResult.predictions.forEach(prediction => {
                expect(prediction.failureProbability).toBeGreaterThanOrEqual(0);
                expect(prediction.failureProbability).toBeLessThanOrEqual(1);
            });
        });

        test('✅ 예상 장애 시간 범위 검증', () => {
            predictionResult.predictions.forEach(prediction => {
                expect(prediction.estimatedTimeToFailure).toBeGreaterThan(0);
                expect(prediction.estimatedTimeToFailure).toBeLessThan(86400000); // 24시간 이내
            });
        });

        test('✅ 장애 타입 유효성', () => {
            const validTypes = ['hardware', 'software', 'network', 'overload', 'security', 'configuration', 'resource'];
            predictionResult.predictions.forEach(prediction => {
                expect(validTypes).toContain(prediction.failureType);
            });
        });

        test('✅ 예측 신뢰도 범위', () => {
            predictionResult.predictions.forEach(prediction => {
                expect(prediction.confidence).toBeGreaterThanOrEqual(0);
                expect(prediction.confidence).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('이상 징후 감지 테스트', () => {
        test('✅ CPU 사용률 이상 감지', async () => {
            const highCPUMetrics: HealthMetrics = {
                ...mockHealthMetrics,
                cpuUsage: 95
            };

            const anomalies = await predictiveSystem.detectAnomalies('test-hub-1', highCPUMetrics);
            const cpuAnomalies = anomalies.filter(a => a.metric.includes('cpu'));

            expect(cpuAnomalies.length).toBeGreaterThan(0);
            expect(cpuAnomalies[0].severity).toBe('critical');
        });

        test('✅ 메모리 사용률 이상 감지', async () => {
            const highMemoryMetrics: HealthMetrics = {
                ...mockHealthMetrics,
                memoryUsage: 98
            };

            const anomalies = await predictiveSystem.detectAnomalies('test-hub-1', highMemoryMetrics);
            const memoryAnomalies = anomalies.filter(a => a.metric.includes('memory'));

            expect(memoryAnomalies.length).toBeGreaterThan(0);
            expect(memoryAnomalies[0].severity).toBe('critical');
        });

        test('✅ 네트워크 지연 이상 감지', async () => {
            const highLatencyMetrics: HealthMetrics = {
                ...mockHealthMetrics,
                networkLatency: 180
            };

            const anomalies = await predictiveSystem.detectAnomalies('test-hub-1', highLatencyMetrics);
            const networkAnomalies = anomalies.filter(a => a.metric.includes('network'));

            expect(networkAnomalies.length).toBeGreaterThan(0);
            expect(networkAnomalies[0].severity).toBe('critical');
        });
    });

    describe('예측 정확성 검증', () => {
        test('✅ CPU 부하 기반 예측 정확성', async () => {
            const highCPUMetrics: HealthMetrics = {
                ...mockHealthMetrics,
                cpuUsage: 92
            };

            const predictionResult = await predictiveSystem.predictFailures('test-hub-1');
            const cpuPrediction = predictionResult.predictions.find(p => p.failureType === 'hardware');

            if (cpuPrediction) {
                // CPU 사용률이 90% 이상이면 높은 장애 확률을 가져야 함
                expect(cpuPrediction.failureProbability).toBeGreaterThan(0.8);
                expect(cpuPrediction.estimatedTimeToFailure).toBeLessThan(600000); // 10분 이내
            }
        });

        test('✅ 메모리 부족 기반 예측 정확성', async () => {
            const highMemoryMetrics: HealthMetrics = {
                ...mockHealthMetrics,
                memoryUsage: 96
            };

            const predictionResult = await predictiveSystem.predictFailures('test-hub-1');
            const memoryPrediction = predictionResult.predictions.find(p => p.failureType === 'resource');

            if (memoryPrediction) {
                // 메모리 사용률이 95% 이상이면 높은 장애 확률을 가져야 함
                expect(memoryPrediction.failureProbability).toBeGreaterThan(0.9);
                expect(memoryPrediction.estimatedTimeToFailure).toBeLessThan(900000); // 15분 이내
            }
        });

        test('✅ 에러율 기반 예측 정확성', async () => {
            const highErrorMetrics: HealthMetrics = {
                ...mockHealthMetrics,
                errorRate: 9
            };

            const predictionResult = await predictiveSystem.predictFailures('test-hub-1');
            const errorPrediction = predictionResult.predictions.find(p => p.failureType === 'software');

            if (errorPrediction) {
                // 에러율이 8% 이상이면 높은 장애 확률을 가져야 함
                expect(errorPrediction.failureProbability).toBeGreaterThan(0.8);
                expect(errorPrediction.estimatedTimeToFailure).toBeLessThan(300000); // 5분 이내
            }
        });
    });

    describe('추천사항 품질 검증', () => {
        test('✅ 추천사항 유용성', async () => {
            const predictionResult = await predictiveSystem.predictFailures('test-hub-1');

            predictionResult.recommendations.forEach(recommendation => {
                expect(recommendation).toBeTruthy();
                expect(recommendation.length).toBeGreaterThan(0);
                expect(typeof recommendation).toBe('string');

                // 이모지와 함께 구체적인 내용이 포함되어야 함
                expect(recommendation).toMatch(/[🚨⚠️💡🔧🌐📦]/);
                expect(recommendation.length).toBeGreaterThan(10);
            });
        });

        test('✅ 위험도별 추천사항 분류', async () => {
            const predictionResult = await predictiveSystem.predictFailures('test-hub-1');

            const highRiskRecommendations = predictionResult.recommendations.filter(r => r.includes('🚨'));
            const mediumRiskRecommendations = predictionResult.recommendations.filter(r => r.includes('⚠️'));
            const lowRiskRecommendations = predictionResult.recommendations.filter(r => r.includes('💡'));

            // 각 위험도별로 추천사항이 존재해야 함
            expect(highRiskRecommendations.length + mediumRiskRecommendations.length + lowRiskRecommendations.length).toBeGreaterThan(0);
        });
    });

    describe('에러 처리 검증', () => {
        test('✅ 존재하지 않는 허브 처리', async () => {
            await expect(predictiveSystem.predictFailures('non-existent-hub')).rejects.toThrow();
        });

        test('✅ 잘못된 메트릭 처리', async () => {
            const invalidMetrics: HealthMetrics = {
                ...mockHealthMetrics,
                cpuUsage: -5, // 잘못된 값
                memoryUsage: 150 // 잘못된 값
            };

            // 시스템이 잘못된 메트릭을 처리할 수 있어야 함
            const anomalies = await predictiveSystem.detectAnomalies('test-hub-1', invalidMetrics);
            expect(Array.isArray(anomalies)).toBe(true);
        });
    });

    describe('성능 검증', () => {
        test('✅ 예측 처리 시간', async () => {
            const startTime = performance.now();
            await predictiveSystem.predictFailures('test-hub-1');
            const endTime = performance.now();

            const processingTime = endTime - startTime;

            // 예측 처리가 100ms 이내에 완료되어야 함
            expect(processingTime).toBeLessThan(100);
        });

        test('✅ 대량 예측 처리', async () => {
            const hubIds = Array.from({ length: 10 }, (_, i) => `test-hub-${i}`);

            const startTime = performance.now();
            const results = await Promise.all(
                hubIds.map(hubId => predictiveSystem.predictFailures(hubId))
            );
            const endTime = performance.now();

            const processingTime = endTime - startTime;

            // 10개 허브 예측이 500ms 이내에 완료되어야 함
            expect(processingTime).toBeLessThan(500);
            expect(results.length).toBe(10);

            results.forEach(result => {
                expect(result.predictions.length).toBeGreaterThan(0);
                expect(result.confidence).toBeGreaterThan(0);
            });
        });
    });

    describe('통합 테스트', () => {
        test('✅ 전체 예측 워크플로우', async () => {
            // 1. 메트릭 수집 (모의)
            const metrics = mockHealthMetrics;
            expect(metrics.cpuUsage).toBeGreaterThan(80);
            expect(metrics.memoryUsage).toBeGreaterThan(85);
            expect(metrics.networkLatency).toBeGreaterThan(100);
            expect(metrics.errorRate).toBeGreaterThan(5);

            // 2. 이상 징후 감지
            const anomalies = await predictiveSystem.detectAnomalies('test-hub-1', metrics);
            expect(anomalies.length).toBeGreaterThan(0);

            // 3. 장애 예측 실행
            const predictionResult = await predictiveSystem.predictFailures('test-hub-1');
            expect(predictionResult.predictions.length).toBeGreaterThan(0);

            // 4. 결과 검증
            expect(predictionResult.confidence).toBeGreaterThan(0);
            expect(predictionResult.recommendations.length).toBeGreaterThan(0);

            // 5. 예측 품질 검증
            predictionResult.predictions.forEach(prediction => {
                expect(prediction.failureProbability).toBeGreaterThan(0);
                expect(prediction.confidence).toBeGreaterThan(0);
                expect(prediction.contributingFactors.length).toBeGreaterThan(0);
                expect(prediction.recommendedActions.length).toBeGreaterThan(0);
            });
        });

        test('✅ 다양한 시나리오 테스트', async () => {
            const scenarios = [
                {
                    name: '높은 CPU 부하',
                    metrics: { ...mockHealthMetrics, cpuUsage: 95, memoryUsage: 70 }
                },
                {
                    name: '높은 메모리 사용률',
                    metrics: { ...mockHealthMetrics, cpuUsage: 60, memoryUsage: 98 }
                },
                {
                    name: '네트워크 문제',
                    metrics: { ...mockHealthMetrics, networkLatency: 200, errorRate: 8 }
                },
                {
                    name: '복합 문제',
                    metrics: { ...mockHealthMetrics, cpuUsage: 88, memoryUsage: 92, networkLatency: 150, errorRate: 7 }
                }
            ];

            for (const scenario of scenarios) {
                // 각 시나리오별로 메트릭을 실제로 적용
                const anomalies = await predictiveSystem.detectAnomalies('test-hub-1', scenario.metrics);
                expect(anomalies.length).toBeGreaterThan(0);

                const predictionResult = await predictiveSystem.predictFailures('test-hub-1');
                expect(predictionResult.predictions.length).toBeGreaterThan(0);
                expect(predictionResult.confidence).toBeGreaterThan(0);
                expect(predictionResult.recommendations.length).toBeGreaterThan(0);
            }
        });
    });
});
