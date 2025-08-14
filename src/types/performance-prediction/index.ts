export { HealthMetrics } from '../risk-management';

/**
 * 🚀 실시간 성능 예측 및 자동 스케일링 타입 정의
 */

/**
 * 📊 성능 예측 결과
 */
export interface PerformancePrediction {
    hubId: string;
    timestamp: Date;
    timeHorizon: number; // 예측 시간 범위 (밀리초)
    predictions: Map<string, number[]>; // 메트릭별 예측값 배열
    trends: Map<string, number>; // 메트릭별 트렌드
    scalingDecision: ScalingDecision; // 스케일링 결정
    confidence: number; // 예측 신뢰도 (0-100%)
    resourceDemand: ResourceDemand; // 리소스 수요
    riskLevel: string; // 위험도 (low, medium, high, critical)
    recommendations: string[]; // 권장사항
}

/**
 * ⚖️ 스케일링 결정
 */
export interface ScalingDecision {
    action: 'scale_up' | 'scale_down' | 'none';
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedImpact: 'minimal' | 'moderate' | 'significant' | 'cost_savings' | 'none';
}

/**
 * 💾 리소스 수요
 */
export interface ResourceDemand {
    cpu: ResourceMetric;
    memory: ResourceMetric;
}

/**
 * 📊 리소스 메트릭
 */
export interface ResourceMetric {
    current: number; // 현재 사용량
    predicted: number; // 예측 사용량
    required: number; // 필요 사용량
}

/**
 * 🔧 성능 예측 설정
 */
export interface PerformancePredictionConfig {
    predictionWindow: number; // 예측 시간 범위 (밀리초)
    scalingThreshold: number; // 스케일링 임계값
    minScalingInterval: number; // 최소 스케일링 간격 (밀리초)
    maxHistorySize: number; // 최대 히스토리 크기
    trendAnalysisWindow: number; // 트렌드 분석 윈도우
    confidenceThreshold: number; // 신뢰도 임계값
}

/**
 * 📈 성능 트렌드
 */
export interface PerformanceTrend {
    metric: string;
    slope: number; // 트렌드 기울기
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: 'weak' | 'moderate' | 'strong';
    confidence: number; // 트렌드 신뢰도
}

/**
 * 🎯 스케일링 정책
 */
export interface ScalingPolicy {
    name: string;
    description: string;
    conditions: ScalingCondition[];
    actions: ScalingAction[];
    priority: number;
    enabled: boolean;
}

/**
 * 🔍 스케일링 조건
 */
export interface ScalingCondition {
    metric: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    threshold: number;
    duration: number; // 조건 만족 지속 시간 (밀리초)
}

/**
 * 🛠️ 스케일링 액션
 */
export interface ScalingAction {
    type: 'cpu' | 'memory' | 'replicas' | 'custom';
    value: number | string;
    method: 'add' | 'subtract' | 'set' | 'multiply';
    cooldown: number; // 액션 후 대기 시간 (밀리초)
}

/**
 * 📊 자동 스케일링 결과
 */
export interface AutoScalingResult {
    hubId: string;
    timestamp: Date;
    policy: string;
    action: ScalingAction;
    success: boolean;
    previousState: ResourceDemand;
    newState: ResourceDemand;
    executionTime: number; // 실행 시간 (밀리초)
    error?: string;
}

/**
 * 🔄 스케일링 히스토리
 */
export interface ScalingHistory {
    hubId: string;
    timestamp: Date;
    action: string;
    reason: string;
    success: boolean;
    metrics: HealthMetrics;
    resourceChange: ResourceDemand;
}

/**
 * 📈 성능 예측 메트릭
 */
export interface PredictionMetrics {
    cpu: {
        current: number;
        predicted: number[];
        trend: number;
        confidence: number;
    };
    memory: {
        current: number;
        predicted: number[];
        trend: number;
        confidence: number;
    };
    responseTime: {
        current: number;
        predicted: number[];
        trend: number;
        confidence: number;
    };
    errorRate: {
        current: number;
        predicted: number[];
        trend: number;
        confidence: number;
    };
}

/**
 * 🎯 예측 정확도
 */
export interface PredictionAccuracy {
    metric: string;
    actualValue: number;
    predictedValue: number;
    error: number;
    errorPercentage: number;
    accuracy: number; // 0-100%
}

/**
 * 📊 성능 예측 리포트
 */
export interface PerformancePredictionReport {
    hubId: string;
    timestamp: Date;
    timeRange: {
        start: Date;
        end: Date;
    };
    predictions: PredictionMetrics;
    accuracy: PredictionAccuracy[];
    trends: PerformanceTrend[];
    scalingRecommendations: ScalingDecision[];
    riskAssessment: {
        level: string;
        factors: string[];
        mitigation: string[];
    };
    summary: {
        totalPredictions: number;
        averageConfidence: number;
        scalingActions: number;
        riskLevel: string;
    };
}
