// 분산형 리스크 관리 시스템 타입 정의
// 생성일: 2025년 8월 13일
// 목적: MCPHub의 분산형 리스크 관리 시스템에 필요한 모든 타입 정의

// 🌍 분산형 MCP 허브 관련 타입
export interface DistributedMCPHub {
    hubId: string;
    hubType: HubType;
    location: HubLocation;
    healthStatus: HealthStatus;
    loadBalancing: LoadBalancingConfig;
    failover: FailoverConfig;
    capacity: number;
    currentLoad: number;
    lastHealthCheck: Date;
    metadata: HubMetadata;
}

export type HubType = 'primary' | 'secondary' | 'edge' | 'backup';
export type HubLocation = 'us-east' | 'us-west' | 'eu-central' | 'ap-northeast' | 'sa-east' | 'af-south';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical' | 'maintenance';

export interface LoadBalancingConfig {
    algorithm: LoadBalancingAlgorithm;
    healthCheckInterval: number; // milliseconds
    failoverThreshold: number;
    stickySessions: boolean;
    sessionTimeout: number; // milliseconds
    maxRetries: number;
}

export type LoadBalancingAlgorithm = 'round-robin' | 'least-connections' | 'geographic' | 'health-based' | 'weighted' | 'ip-hash';

export interface FailoverConfig {
    automaticFailover: boolean;
    failoverTime: number; // milliseconds
    dataReplication: ReplicationType;
    consistencyLevel: ConsistencyLevel;
    backupHubs: string[]; // 백업 허브 ID 목록
    manualOverride: boolean;
}

export type ReplicationType = 'synchronous' | 'asynchronous' | 'semi-synchronous' | 'none';
export type ConsistencyLevel = 'strong' | 'eventual' | 'weak' | 'causal';

export interface HubMetadata {
    version: string;
    capabilities: string[];
    supportedProtocols: string[];
    region: string;
    dataCenter: string;
    networkLatency: number; // milliseconds
    bandwidth: number; // Mbps
}

// 🩺 헬스 모니터링 관련 타입
export interface HealthMetrics {
    hubId: string;
    timestamp: Date;
    cpuUsage: number; // 0-100%
    memoryUsage: number; // 0-100%
    diskUsage: number; // 0-100%
    networkLatency: number; // milliseconds
    responseTime: number; // milliseconds
    errorRate: number; // 0-100%
    activeConnections: number;
    throughput: number; // requests per second
}

export interface HealthStatus {
    hubId: string;
    status: HealthStatus;
    lastCheck: Date;
    metrics: HealthMetrics;
    issues: HealthIssue[];
    recommendations: string[];
}

export interface HealthIssue {
    type: 'performance' | 'security' | 'connectivity' | 'resource' | 'configuration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
    resolvedAt?: Date;
    impact: string;
    suggestedActions: string[];
}

// 🔮 AI 기반 예측적 장애 방지 관련 타입
export interface FailurePrediction {
    hubId: string;
    failureProbability: number; // 0-1
    estimatedTimeToFailure: number; // milliseconds
    failureType: FailureType;
    confidence: number; // 0-1
    contributingFactors: ContributingFactor[];
    recommendedActions: string[];
    predictedImpact: FailureImpact;
    timestamp: Date;
}

export type FailureType = 'hardware' | 'software' | 'network' | 'overload' | 'security' | 'configuration' | 'resource';

export interface ContributingFactor {
    factor: string;
    weight: number; // 0-1
    description: string;
    currentValue: number;
    threshold: number;
    trend: 'improving' | 'stable' | 'degrading';
}

export interface FailureImpact {
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedServices: string[];
    estimatedDowntime: number; // milliseconds
    userImpact: string;
    businessImpact: string;
    recoveryTime: number; // milliseconds
}

export interface PreventiveAction {
    id: string;
    type: 'load-reduction' | 'resource-scaling' | 'maintenance' | 'configuration-change' | 'backup-creation';
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration: number; // milliseconds
    estimatedCost: number;
    successProbability: number; // 0-1
    riskLevel: 'low' | 'medium' | 'high';
    prerequisites: string[];
}

// 🔄 장애 전환 관련 타입
export interface FailoverRequest {
    sourceHubId: string;
    targetHubId: string;
    reason: FailoverReason;
    priority: 'low' | 'medium' | 'high' | 'critical';
    userData: boolean; // 사용자 데이터 마이그레이션 여부
    estimatedDuration: number; // milliseconds
}

export type FailoverReason = 'planned-maintenance' | 'hardware-failure' | 'software-failure' | 'network-issue' | 'overload' | 'security-threat' | 'performance-degradation';

export interface FailoverResult {
    success: boolean;
    sourceHubId: string;
    targetHubId: string;
    failoverTime: number; // milliseconds
    userImpact: 'minimal' | 'moderate' | 'significant';
    estimatedRecoveryTime: number; // milliseconds
    migratedData: MigratedData;
    errors: FailoverError[];
    warnings: string[];
}

export interface MigratedData {
    userSessions: number;
    activeWorkflows: number;
    cachedData: number; // MB
    configuration: boolean;
    logs: boolean;
}

export interface FailoverError {
    code: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    retryable: boolean;
}

// 🔐 데이터 복제 및 무결성 관련 타입
export interface ReplicationConfig {
    type: ReplicationType;
    consistency: ConsistencyLevel;
    locations: string[];
    replicationFactor: number;
    conflictResolution: ConflictResolutionStrategy;
    compression: boolean;
    encryption: boolean;
    retention: number; // days
}

export type ConflictResolutionStrategy = 'last-write-wins' | 'vector-clock' | 'custom' | 'manual' | 'timestamp-based';

export interface ReplicationStatus {
    hubId: string;
    targetHubId: string;
    status: 'active' | 'paused' | 'failed' | 'syncing';
    lastSync: Date;
    syncInterval: number; // milliseconds
    dataSize: number; // MB
    syncProgress: number; // 0-100%
    errors: ReplicationError[];
}

export interface ReplicationError {
    code: string;
    message: string;
    timestamp: Date;
    retryCount: number;
    maxRetries: number;
    resolved: boolean;
}

export interface DataIntegrityReport {
    hubId: string;
    timestamp: Date;
    integrityScore: number; // 0-100%
    corruptedFiles: number;
    missingFiles: number;
    checksumMismatches: number;
    lastValidation: Date;
    recommendations: string[];
}

// 📊 성능 모니터링 및 분석 관련 타입
export interface PerformanceMetrics {
    hubId: string;
    timestamp: Date;
    responseTime: ResponseTimeMetrics;
    throughput: ThroughputMetrics;
    resourceUsage: ResourceUsageMetrics;
    networkMetrics: NetworkMetrics;
    errorMetrics: ErrorMetrics;
}

export interface ResponseTimeMetrics {
    average: number; // milliseconds
    p50: number; // milliseconds
    p95: number; // milliseconds
    p99: number; // milliseconds
    min: number; // milliseconds
    max: number; // milliseconds
}

export interface ThroughputMetrics {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
}

export interface ResourceUsageMetrics {
    cpu: CPUUsageMetrics;
    memory: MemoryUsageMetrics;
    disk: DiskUsageMetrics;
    network: NetworkUsageMetrics;
}

export interface CPUUsageMetrics {
    current: number; // 0-100%
    average: number; // 0-100%
    peak: number; // 0-100%
    idle: number; // 0-100%
    loadAverage: number[];
}

export interface MemoryUsageMetrics {
    total: number; // MB
    used: number; // MB
    free: number; // MB
    available: number; // MB
    usagePercentage: number; // 0-100%
}

export interface DiskUsageMetrics {
    total: number; // MB
    used: number; // MB
    free: number; // MB
    usagePercentage: number; // 0-100%
    readSpeed: number; // MB/s
    writeSpeed: number; // MB/s
}

export interface NetworkMetrics {
    bytesIn: number; // MB
    bytesOut: number; // MB
    packetsIn: number;
    packetsOut: number;
    errorsIn: number;
    errorsOut: number;
    droppedIn: number;
    droppedOut: number;
}

export interface ErrorMetrics {
    totalErrors: number;
    errorRate: number; // 0-100%
    errorTypes: Map<string, number>;
    lastError: Date;
    errorTrend: 'increasing' | 'stable' | 'decreasing';
}

// 🚨 알림 및 이벤트 관련 타입
export interface Alert {
    id: string;
    level: AlertLevel;
    category: AlertCategory;
    title: string;
    message: string;
    hubId?: string;
    timestamp: Date;
    requiresAction: boolean;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolved: boolean;
    resolvedAt?: Date;
    metadata: Record<string, any>;
}

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';
export type AlertCategory = 'health' | 'performance' | 'security' | 'failover' | 'replication' | 'system';

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    condition: AlertCondition;
    actions: AlertAction[];
    enabled: boolean;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertCondition {
    metric: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    threshold: number;
    duration: number; // milliseconds
    aggregation: 'min' | 'max' | 'avg' | 'sum' | 'count';
}

export interface AlertAction {
    type: 'notification' | 'webhook' | 'email' | 'sms' | 'slack' | 'custom';
    target: string;
    template: string;
    parameters: Record<string, any>;
}

// 🔧 설정 및 구성 관련 타입
export interface RiskManagementConfig {
    global: GlobalConfig;
    hubs: Map<string, HubConfig>;
    monitoring: MonitoringConfig;
    failover: FailoverConfig;
    replication: ReplicationConfig;
    alerts: AlertConfig;
    security: SecurityConfig;
}

export interface GlobalConfig {
    enabled: boolean;
    mode: 'automatic' | 'semi-automatic' | 'manual';
    defaultTimeout: number; // milliseconds
    maxConcurrentFailovers: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface HubConfig {
    hubId: string;
    enabled: boolean;
    priority: number;
    backupHubs: string[];
    healthCheckInterval: number; // milliseconds
    failoverThreshold: number;
    customSettings: Record<string, any>;
}

export interface MonitoringConfig {
    enabled: boolean;
    interval: number; // milliseconds
    metrics: string[];
    retention: number; // days
    aggregation: 'min' | 'max' | 'avg' | 'sum';
}

export interface AlertConfig {
    enabled: boolean;
    defaultLevel: AlertLevel;
    escalation: boolean;
    escalationDelay: number; // milliseconds
    maxEscalations: number;
    notificationChannels: string[];
}

export interface SecurityConfig {
    enabled: boolean;
    encryption: boolean;
    authentication: boolean;
    authorization: boolean;
    auditLogging: boolean;
    sslRequired: boolean;
    allowedIPs: string[];
}

// 📈 통계 및 리포트 관련 타입
export interface RiskManagementStats {
    totalHubs: number;
    healthyHubs: number;
    degradedHubs: number;
    unhealthyHubs: number;
    totalFailovers: number;
    successfulFailovers: number;
    failedFailovers: number;
    averageFailoverTime: number; // milliseconds
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    uptime: number; // percentage
    lastUpdated: Date;
}

export interface RiskManagementReport {
    id: string;
    title: string;
    period: {
        start: Date;
        end: Date;
    };
    summary: string;
    stats: RiskManagementStats;
    details: ReportDetail[];
    recommendations: string[];
    generatedAt: Date;
    generatedBy: string;
}

export interface ReportDetail {
    category: string;
    title: string;
    description: string;
    data: any;
    charts?: ChartData[];
}

export interface ChartData {
    type: 'line' | 'bar' | 'pie' | 'table';
    title: string;
    data: any[];
    options?: Record<string, any>;
}

// 🔄 워크플로우 및 자동화 관련 타입
export interface RiskManagementWorkflow {
    id: string;
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
    enabled: boolean;
    version: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkflowTrigger {
    type: 'schedule' | 'event' | 'manual' | 'condition';
    schedule?: string; // cron expression
    event?: string;
    condition?: string;
}

export interface WorkflowStep {
    id: string;
    name: string;
    type: 'action' | 'condition' | 'loop' | 'parallel';
    action?: string;
    parameters?: Record<string, any>;
    conditions?: string[];
    nextSteps: string[];
    timeout: number; // milliseconds
    retry: RetryConfig;
}

export interface RetryConfig {
    enabled: boolean;
    maxRetries: number;
    delay: number; // milliseconds
    backoff: 'linear' | 'exponential' | 'fixed';
}

// 🎯 에러 및 예외 처리 관련 타입
export class RiskManagementError extends Error {
    constructor(
        message: string,
        public code: string,
        public hubId?: string,
        public details?: any
    ) {
        super(message);
        this.name = 'RiskManagementError';
    }
}

export class FailoverError extends Error {
    constructor(
        message: string,
        public sourceHubId: string,
        public targetHubId: string,
        public reason: string
    ) {
        super(message);
        this.name = 'FailoverError';
    }
}

export class HealthCheckError extends Error {
    constructor(
        message: string,
        public hubId: string,
        public checkType: string,
        public metrics?: any
    ) {
        super(message);
        this.name = 'HealthCheckError';
    }
}

// 🔌 플러그인 및 확장 관련 타입
export interface RiskManagementPlugin {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    capabilities: string[];
    hooks: PluginHook[];
    configuration: PluginConfiguration;
}

export interface PluginHook {
    name: string;
    description: string;
    event: string;
    priority: number;
    handler: string;
}

export interface PluginConfiguration {
    enabled: boolean;
    settings: Record<string, any>;
    permissions: string[];
    dependencies: string[];
}

// 📊 실시간 모니터링 관련 타입
export interface RealTimeMetrics {
    hubId: string;
    timestamp: Date;
    metrics: Map<string, number>;
    alerts: Alert[];
    status: HealthStatus;
    performance: PerformanceMetrics;
}

export interface MonitoringDashboard {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    layout: WidgetLayout;
    refreshInterval: number; // milliseconds
    permissions: string[];
}

export interface DashboardWidget {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'status' | 'alert';
    title: string;
    dataSource: string;
    configuration: Record<string, any>;
    position: WidgetPosition;
    size: WidgetSize;
}

export interface WidgetPosition {
    x: number;
    y: number;
}

export interface WidgetSize {
    width: number;
    height: number;
}

export interface WidgetLayout {
    columns: number;
    rows: number;
    widgets: WidgetPosition[];
}

// 🎯 유틸리티 타입들
export type ServerStatus = 'active' | 'inactive' | 'error' | 'maintenance' | 'failover';
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'running';
export type ConfigurationStatus = 'draft' | 'active' | 'archived' | 'error' | 'validating';

// 🔍 검색 및 필터링 관련 타입
export interface SearchCriteria {
    query: string;
    filters: SearchFilter[];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    limit: number;
    offset: number;
}

export interface SearchFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
    value: any;
}

export interface SearchResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    query: string;
    filters: SearchFilter[];
    executionTime: number; // milliseconds
}

// 📝 로깅 및 감사 관련 타입
export interface AuditLog {
    id: string;
    timestamp: Date;
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    errorMessage?: string;
}

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    category: string;
    message: string;
    metadata: Record<string, any>;
    hubId?: string;
    traceId?: string;
    spanId?: string;
}

// 🔐 인증 및 권한 관련 타입
export interface User {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    permissions: string[];
    lastLogin: Date;
    isActive: boolean;
}

export type UserRole = 'admin' | 'operator' | 'viewer' | 'guest';

export interface Permission {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
    conditions?: string[];
}

export interface AuthenticationResult {
    success: boolean;
    user?: User;
    token?: string;
    expiresAt?: Date;
    errorMessage?: string;
}

export interface AuthorizationResult {
    allowed: boolean;
    reason?: string;
    requiredPermissions?: string[];
    userPermissions?: string[];
}
