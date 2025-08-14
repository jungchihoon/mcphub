import { HealthMetrics, PerformancePrediction, ResourceDemand, ScalingDecision } from '../../types/performance-prediction';

/**
 * 🚀 실시간 성능 예측 및 자동 스케일링 시스템
 * 
 * 외부 성능 에이전트로부터 실시간 메트릭을 받아
 * 미래 성능을 예측하고 자동으로 리소스를 조정합니다.
 */
export class RealTimePerformancePredictor {
    private readonly predictionWindow: number = 300000; // 5분 예측
    private readonly scalingThreshold: number = 0.8; // 80% 임계값
    private readonly minScalingInterval: number = 60000; // 최소 1분 간격
    private lastScalingTime: number = 0;
    private readonly performanceHistory: Map<string, HealthMetrics[]> = new Map();
    private readonly maxHistorySize: number = 1000;

    constructor() {
        console.log('🚀 실시간 성능 예측 및 자동 스케일링 시스템 초기화');
    }

    /**
     * 🔮 실시간 성능 예측 실행
     */
    async predictPerformance(
        hubId: string,
        currentMetrics: HealthMetrics,
        timeHorizon: number = 300000 // 5분
    ): Promise<PerformancePrediction> {
        try {
            // 입력값 검증
            if (!hubId || hubId.trim() === '') {
                throw new Error('허브 ID는 비어있을 수 없습니다.');
            }

            if (!currentMetrics || !this.isValidMetrics(currentMetrics)) {
                throw new Error('유효하지 않은 메트릭 데이터입니다.');
            }

            console.log(`🔮 실시간 성능 예측 시작: ${hubId}, 예측 시간: ${timeHorizon}ms`);

            // 1. 성능 히스토리에 현재 메트릭 추가
            this.addToHistory(hubId, currentMetrics);

            // 2. 트렌드 분석
            const trends = this.analyzeTrends(hubId);

            // 3. 미래 성능 예측
            const predictions = await this.generatePredictions(currentMetrics, trends, timeHorizon);

            // 4. 스케일링 필요성 판단
            const scalingDecision = this.evaluateScalingNeeds(predictions, currentMetrics);

            // 5. 예측 결과 반환
            const result: PerformancePrediction = {
                hubId,
                timestamp: new Date(),
                timeHorizon,
                predictions,
                trends,
                scalingDecision,
                confidence: this.calculatePredictionConfidence(predictions, trends),
                resourceDemand: this.calculateResourceDemand(predictions),
                riskLevel: this.assessRiskLevel(predictions),
                recommendations: this.generateRecommendations(predictions, scalingDecision)
            };

            console.log(`✅ 성능 예측 완료: ${hubId}, 신뢰도: ${result.confidence}%`);
            return result;

        } catch (error) {
            console.error(`❌ 성능 예측 오류 (${hubId}):`, error);
            throw new Error(`성능 예측 실패: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 📊 성능 히스토리에 메트릭 추가
     */
    private addToHistory(hubId: string, metrics: HealthMetrics): void {
        if (!this.performanceHistory.has(hubId)) {
            this.performanceHistory.set(hubId, []);
        }

        const history = this.performanceHistory.get(hubId)!;
        history.push(metrics);

        // 히스토리 크기 제한
        if (history.length > this.maxHistorySize) {
            history.shift();
        }
    }

    /**
     * ✅ 메트릭 유효성 검사
     */
    private isValidMetrics(metrics: HealthMetrics): boolean {
        return (
            metrics &&
            typeof metrics.hubId === 'string' &&
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.responseTime === 'number' &&
            typeof metrics.errorRate === 'number' &&
            metrics.cpuUsage >= 0 && metrics.cpuUsage <= 100 &&
            metrics.memoryUsage >= 0 && metrics.memoryUsage <= 100 &&
            metrics.responseTime >= 0 &&
            metrics.errorRate >= 0 && metrics.errorRate <= 100
        );
    }

    /**
     * 📈 트렌드 분석
     */
    private analyzeTrends(hubId: string): Map<string, number> {
        const history = this.performanceHistory.get(hubId);
        if (!history || history.length < 2) {
            // 히스토리가 부족할 때는 기본 트렌드 생성
            const trends = new Map<string, number>();
            trends.set('cpu', 0);
            trends.set('memory', 0);
            trends.set('responseTime', 0);
            trends.set('errorRate', 0);
            return trends;
        }

        const trends = new Map<string, number>();
        const recentMetrics = history.slice(-10); // 최근 10개 메트릭

        // CPU 사용률 트렌드
        const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.cpuUsage));
        trends.set('cpu', cpuTrend);

        // 메모리 사용률 트렌드
        const memoryTrend = this.calculateTrend(recentMetrics.map(m => m.memoryUsage));
        trends.set('memory', memoryTrend);

        // 응답 시간 트렌드
        const responseTimeTrend = this.calculateTrend(recentMetrics.map(m => m.responseTime));
        trends.set('responseTime', responseTimeTrend);

        // 에러율 트렌드
        const errorRateTrend = this.calculateTrend(recentMetrics.map(m => m.errorRate));
        trends.set('errorRate', errorRateTrend);

        return trends;
    }

    /**
     * 📊 트렌드 계산 (선형 회귀 기반)
     */
    private calculateTrend(values: number[]): number {
        if (values.length < 2) return 0;

        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    }

    /**
     * 🔮 미래 성능 예측 생성
     */
    private async generatePredictions(
        currentMetrics: HealthMetrics,
        trends: Map<string, number>,
        timeHorizon: number
    ): Promise<Map<string, number[]>> {
        const predictions = new Map<string, number[]>();
        const steps = Math.ceil(timeHorizon / 30000); // 30초마다 예측

        // CPU 사용률 예측
        const cpuPredictions = this.predictMetric(
            currentMetrics.cpuUsage,
            trends.get('cpu') || 0,
            steps
        );
        predictions.set('cpu', cpuPredictions);

        // 메모리 사용률 예측
        const memoryPredictions = this.predictMetric(
            currentMetrics.memoryUsage,
            trends.get('memory') || 0,
            steps
        );
        predictions.set('memory', memoryPredictions);

        // 응답 시간 예측
        const responseTimePredictions = this.predictMetric(
            currentMetrics.responseTime,
            trends.get('responseTime') || 0,
            steps
        );
        predictions.set('responseTime', responseTimePredictions);

        // 에러율 예측
        const errorRatePredictions = this.predictMetric(
            currentMetrics.errorRate,
            trends.get('errorRate') || 0,
            steps
        );
        predictions.set('errorRate', errorRatePredictions);

        return predictions;
    }

    /**
     * 📊 개별 메트릭 예측
     */
    private predictMetric(
        currentValue: number,
        trend: number,
        steps: number
    ): number[] {
        const predictions: number[] = [];

        for (let i = 1; i <= steps; i++) {
            const predictedValue = currentValue + (trend * i * 0.5); // 트렌드 영향도 조정

            // 예측값 범위 제한
            let boundedValue: number;
            if (predictedValue < 0) {
                boundedValue = 0;
            } else if (predictedValue > 100) {
                boundedValue = 100;
            } else {
                boundedValue = predictedValue;
            }

            predictions.push(Math.round(boundedValue * 100) / 100);
        }

        return predictions;
    }

    /**
     * ⚖️ 스케일링 필요성 판단
     */
    private evaluateScalingNeeds(
        predictions: Map<string, number[]>,
        currentMetrics: HealthMetrics
    ): ScalingDecision {
        const now = Date.now();

        // 최소 스케일링 간격 확인
        if (now - this.lastScalingTime < this.minScalingInterval) {
            return {
                action: 'none',
                reason: '최소 스케일링 간격 미달성',
                priority: 'low',
                estimatedImpact: 'minimal'
            };
        }

        // CPU 기반 스케일링 판단
        const cpuPredictions = predictions.get('cpu') || [];
        const maxCpuPrediction = Math.max(...cpuPredictions);

        if (maxCpuPrediction > 90) {
            this.lastScalingTime = now;
            return {
                action: 'scale_up',
                reason: `CPU 사용률 예측: ${maxCpuPrediction.toFixed(1)}% (임계값: 90%)`,
                priority: 'high',
                estimatedImpact: 'significant'
            };
        }

        // 메모리 기반 스케일링 판단
        const memoryPredictions = predictions.get('memory') || [];
        const maxMemoryPrediction = Math.max(...memoryPredictions);

        if (maxMemoryPrediction > 85) {
            this.lastScalingTime = now;
            return {
                action: 'scale_up',
                reason: `메모리 사용률 예측: ${maxMemoryPrediction.toFixed(1)}% (임계값: 85%)`,
                priority: 'high',
                estimatedImpact: 'significant'
            };
        }

        // 응답 시간 기반 스케일링 판단 (현재 메트릭 기준)
        if (currentMetrics.responseTime > 1000) {
            this.lastScalingTime = now;
            return {
                action: 'scale_up',
                reason: `응답 시간: ${currentMetrics.responseTime.toFixed(0)}ms (임계값: 1000ms)`,
                priority: 'medium',
                estimatedImpact: 'moderate'
            };
        }

        // 다운스케일링 판단 (리소스 여유 시)
        if (currentMetrics.cpuUsage < 30 && currentMetrics.memoryUsage < 40) {
            this.lastScalingTime = now;
            return {
                action: 'scale_down',
                reason: '리소스 사용률 낮음 (CPU < 30%, Memory < 40%)',
                priority: 'low',
                estimatedImpact: 'cost_savings'
            };
        }

        return {
            action: 'none',
            reason: '스케일링 불필요',
            priority: 'low',
            estimatedImpact: 'none'
        };
    }

    /**
     * 🎯 예측 신뢰도 계산
     */
    private calculatePredictionConfidence(
        predictions: Map<string, number[]>,
        trends: Map<string, number>
    ): number {
        let confidence = 50; // 기본 신뢰도

        // 트렌드 일관성에 따른 신뢰도 조정
        const trendValues = Array.from(trends.values());
        const trendConsistency = Math.abs(trendValues.reduce((a, b) => a + b, 0)) / trendValues.length;

        if (trendConsistency < 0.1) {
            confidence += 20; // 안정적인 트렌드
        } else if (trendConsistency > 0.5) {
            confidence -= 15; // 급변하는 트렌드
        }

        // 예측 단계 수에 따른 신뢰도 조정
        const predictionSteps = Array.from(predictions.values())[0]?.length || 0;
        if (predictionSteps > 5) {
            confidence -= 10; // 장기 예측은 신뢰도 감소
        }

        return Math.max(0, Math.min(100, Math.round(confidence)));
    }

    /**
     * 💾 리소스 수요 계산
     */
    private calculateResourceDemand(predictions: Map<string, number[]>): ResourceDemand {
        const cpuPredictions = predictions.get('cpu') || [];
        const memoryPredictions = predictions.get('memory') || [];

        const maxCpu = Math.max(...cpuPredictions);
        const maxMemory = Math.max(...memoryPredictions);

        return {
            cpu: {
                current: cpuPredictions[0] || 0,
                predicted: maxCpu,
                required: Math.ceil(maxCpu / 10) * 10 // 10% 단위로 반올림
            },
            memory: {
                current: memoryPredictions[0] || 0,
                predicted: maxMemory,
                required: Math.ceil(maxMemory / 10) * 10
            }
        };
    }

    /**
     * ⚠️ 위험도 평가
     */
    private assessRiskLevel(predictions: Map<string, number[]>): string {
        const cpuPredictions = predictions.get('cpu') || [];
        const memoryPredictions = predictions.get('memory') || [];
        const errorRatePredictions = predictions.get('errorRate') || [];

        const maxCpu = Math.max(...cpuPredictions);
        const maxMemory = Math.max(...memoryPredictions);
        const maxErrorRate = Math.max(...errorRatePredictions);

        if (maxCpu > 95 || maxMemory > 95 || maxErrorRate > 15) {
            return 'critical';
        } else if (maxCpu > 85 || maxMemory > 85 || maxErrorRate > 10) {
            return 'high';
        } else if (maxCpu > 70 || maxMemory > 70 || maxErrorRate > 5) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * 💡 권장사항 생성
     */
    private generateRecommendations(
        predictions: Map<string, number[]>,
        scalingDecision: ScalingDecision
    ): string[] {
        const recommendations: string[] = [];

        if (scalingDecision.action === 'scale_up') {
            recommendations.push('🚀 리소스 스케일업 권장');
            recommendations.push('📊 모니터링 강화 필요');
            recommendations.push('⚡ 응답 시간 최적화 검토');
        } else if (scalingDecision.action === 'scale_down') {
            recommendations.push('💰 비용 절약을 위한 다운스케일링');
            recommendations.push('📈 리소스 효율성 모니터링');
        } else {
            recommendations.push('✅ 현재 리소스 상태 양호');
            recommendations.push('📊 정기적인 성능 모니터링 유지');
        }

        // 위험도별 추가 권장사항
        const riskLevel = this.assessRiskLevel(predictions);
        if (riskLevel === 'critical') {
            recommendations.push('🚨 즉시 조치 필요 - 시스템 안정성 위험');
        } else if (riskLevel === 'high') {
            recommendations.push('⚠️ 주의 필요 - 성능 저하 가능성');
        }

        return recommendations;
    }

    /**
     * 🔄 자동 스케일링 실행
     */
    async executeAutoScaling(
        hubId: string,
        scalingDecision: ScalingDecision
    ): Promise<boolean> {
        try {
            console.log(`🔄 자동 스케일링 실행: ${hubId}, 액션: ${scalingDecision.action}`);

            if (scalingDecision.action === 'none') {
                console.log('ℹ️ 스케일링 액션 없음');
                return true;
            }

            // 실제 스케일링 로직 구현 (Docker, Kubernetes 등)
            const success = await this.performScaling(hubId, scalingDecision);

            if (success) {
                console.log(`✅ 자동 스케일링 성공: ${hubId}`);
            } else {
                console.log(`❌ 자동 스케일링 실패: ${hubId}`);
            }

            return success;

        } catch (error) {
            console.error(`❌ 자동 스케일링 오류 (${hubId}):`, error);
            return false;
        }
    }

    /**
     * 🛠️ 실제 스케일링 수행
     */
    private async performScaling(
        hubId: string,
        scalingDecision: ScalingDecision
    ): Promise<boolean> {
        // 실제 구현에서는 Docker API, Kubernetes API 등 사용
        console.log(`🛠️ 스케일링 수행: ${hubId}, ${scalingDecision.action}`);

        // 시뮬레이션을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 80% 확률로 성공
        return Math.random() > 0.2;
    }
}
