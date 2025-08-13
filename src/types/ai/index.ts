// AI 기반 자동 구성 시스템 타입 정의
// 생성일: 2025년 8월 13일

export interface UserIntent {
  action: string;           // 수행할 작업 (예: "연동", "생성", "최적화")
  target: string;           // 대상 시스템 (예: "GitHub PR", "Jira 이슈")
  constraints: string[];    // 제약사항 (예: ["보안", "성능"])
  preferences: string[];    // 선호사항 (예: ["자동화", "실시간"])
  confidence: number;       // 의도 인식 신뢰도 (0-100%)
}

export interface ServerCapabilities {
  serverId: string;         // MCP 서버 ID
  serverName: string;       // 서버 이름
  tools: Tool[];            // 제공하는 도구들
  metadata: ServerMetadata; // 서버 메타데이터
  compatibility: CompatibilityInfo; // 호환성 정보
  performance: PerformanceMetrics; // 성능 메트릭
}

export interface Tool {
  name: string;             // 도구 이름
  description: string;      // 도구 설명
  parameters: ToolParameter[]; // 도구 파라미터
  returnType: string;       // 반환 타입
  capabilities: string[];   // 제공하는 기능들
}

export interface ToolParameter {
  name: string;             // 파라미터 이름
  type: string;             // 파라미터 타입
  required: boolean;        // 필수 여부
  description: string;      // 파라미터 설명
  defaultValue?: any;       // 기본값
}

export interface ServerMetadata {
  version: string;          // 서버 버전
  author: string;           // 개발자/회사
  description: string;      // 서버 설명
  tags: string[];           // 태그들
  documentation: string;    // 문서 URL
}

export interface CompatibilityInfo {
  mcpVersion: string;       // 지원하는 MCP 버전
  protocols: string[];      // 지원하는 프로토콜
  features: string[];       // 지원하는 기능들
  limitations: string[];    // 제한사항들
}

export interface PerformanceMetrics {
  responseTime: number;     // 응답 시간 (ms)
  throughput: number;       // 처리량 (req/sec)
  reliability: number;      // 안정성 (0-100%)
  scalability: number;      // 확장성 (0-100%)
}

export interface Requirements {
  intent: UserIntent;       // 사용자 의도
  technicalConstraints: TechnicalConstraint[]; // 기술적 제약사항
  performanceRequirements: PerformanceRequirement[]; // 성능 요구사항
  securityRequirements: SecurityRequirement[]; // 보안 요구사항
  integrationRequirements: IntegrationRequirement[]; // 연동 요구사항
}

export interface TechnicalConstraint {
  type: 'hardware' | 'software' | 'network' | 'security' | 'compliance';
  description: string;      // 제약사항 설명
  severity: 'low' | 'medium' | 'high' | 'critical'; // 심각도
  impact: string;           // 영향도
}

export interface PerformanceRequirement {
  metric: 'responseTime' | 'throughput' | 'availability' | 'scalability';
  target: number;           // 목표값
  unit: string;             // 단위
  priority: 'low' | 'medium' | 'high' | 'critical'; // 우선순위
}

export interface SecurityRequirement {
  type: 'authentication' | 'authorization' | 'encryption' | 'audit' | 'compliance';
  description: string;      // 보안 요구사항 설명
  level: 'basic' | 'standard' | 'high' | 'enterprise'; // 보안 수준
}

export interface IntegrationRequirement {
  system: string;           // 연동할 시스템
  protocol: string;         // 연동 프로토콜
  dataFormat: string;       // 데이터 형식
  frequency: string;        // 연동 빈도
}

export interface MCPServer {
  id: string;               // 서버 ID
  name: string;             // 서버 이름
  url: string;              // 서버 URL
  status: 'active' | 'inactive' | 'error'; // 서버 상태
  capabilities: ServerCapabilities; // 서버 기능
  health: ServerHealth;     // 서버 상태 정보
}

export interface ServerHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastCheck: Date;          // 마지막 상태 확인 시간
  responseTime: number;     // 응답 시간
  errorCount: number;       // 에러 횟수
  uptime: number;           // 가동 시간
}

export interface AutoConfigurationResult {
  success: boolean;          // 구성 성공 여부
  servers: MCPServer[];     // 선택된 MCP 서버들
  workflow: WorkflowDefinition; // 생성된 워크플로우
  configuration: Configuration; // 시스템 구성
  recommendations: Recommendation[]; // 권장사항들
  errors: string[];         // 에러 메시지들
}

export interface WorkflowDefinition {
  id: string;               // 워크플로우 ID
  name: string;             // 워크플로우 이름
  description: string;      // 워크플로우 설명
  steps: WorkflowStep[];    // 워크플로우 단계들
  connections: WorkflowConnection[]; // 단계 간 연결
  triggers: WorkflowTrigger[]; // 트리거들
  schedule?: WorkflowSchedule; // 스케줄 정보
}

export interface WorkflowStep {
  id: string;               // 단계 ID
  name: string;             // 단계 이름
  type: 'input' | 'process' | 'output' | 'decision' | 'loop';
  serverId: string;         // 담당 서버 ID
  toolName: string;         // 사용할 도구
  parameters: any;          // 도구 파라미터
  timeout: number;          // 타임아웃 (ms)
  retryPolicy: RetryPolicy; // 재시도 정책
}

export interface WorkflowConnection {
  fromStepId: string;       // 출발 단계 ID
  toStepId: string;         // 도착 단계 ID
  condition?: string;       // 연결 조건
  dataMapping: DataMapping; // 데이터 매핑
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'event' | 'webhook';
  config: any;              // 트리거 설정
  enabled: boolean;         // 활성화 여부
}

export interface WorkflowSchedule {
  cronExpression: string;   // Cron 표현식
  timezone: string;         // 시간대
  enabled: boolean;         // 활성화 여부
}

export interface DataMapping {
  sourceField: string;      // 소스 필드
  targetField: string;      // 타겟 필드
  transformation?: string;  // 변환 규칙
  validation?: string;      // 검증 규칙
}

export interface RetryPolicy {
  maxAttempts: number;      // 최대 시도 횟수
  delay: number;            // 지연 시간 (ms)
  backoff: 'linear' | 'exponential' | 'fixed'; // 백오프 전략
}

export interface Configuration {
  systemName: string;       // 시스템 이름
  description: string;      // 시스템 설명
  servers: ServerConfig[];  // 서버 구성
  workflows: WorkflowConfig[]; // 워크플로우 구성
  settings: SystemSettings; // 시스템 설정
}

export interface ServerConfig {
  serverId: string;         // 서버 ID
  enabled: boolean;         // 활성화 여부
  priority: number;         // 우선순위
  loadBalancing: LoadBalancingConfig; // 로드 밸런싱 설정
  failover: FailoverConfig; // 장애 복구 설정
}

export interface WorkflowConfig {
  workflowId: string;       // 워크플로우 ID
  enabled: boolean;         // 활성화 여부
  version: string;          // 버전
  environment: 'dev' | 'staging' | 'prod'; // 환경
}

export interface LoadBalancingConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  weights?: { [serverId: string]: number }; // 가중치
}

export interface FailoverConfig {
  enabled: boolean;         // 장애 복구 활성화 여부
  primaryServer: string;    // 주 서버
  backupServers: string[];  // 백업 서버들
  healthCheckInterval: number; // 상태 확인 간격
}

export interface SystemSettings {
  logging: LoggingConfig;   // 로깅 설정
  monitoring: MonitoringConfig; // 모니터링 설정
  security: SecurityConfig; // 보안 설정
  performance: PerformanceConfig; // 성능 설정
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  destination: 'file' | 'database' | 'external';
  retention: number;        // 보관 기간 (일)
}

export interface MonitoringConfig {
  enabled: boolean;         // 모니터링 활성화 여부
  metrics: string[];        // 수집할 메트릭들
  alerting: AlertingConfig; // 알림 설정
}

export interface SecurityConfig {
  authentication: 'none' | 'basic' | 'oauth' | 'jwt';
  encryption: 'none' | 'tls' | 'end-to-end';
  audit: boolean;           // 감사 로그 활성화 여부
}

export interface PerformanceConfig {
  cacheEnabled: boolean;    // 캐시 활성화 여부
  cacheSize: number;        // 캐시 크기 (MB)
  timeout: number;          // 기본 타임아웃 (ms)
}

export interface Recommendation {
  type: 'performance' | 'security' | 'cost' | 'usability';
  title: string;            // 권장사항 제목
  description: string;      // 권장사항 설명
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: string;           // 예상 영향
  effort: 'low' | 'medium' | 'high'; // 구현 노력
  implementation: string;   // 구현 방법
}

// 에러 타입들
export class AutoConfigurationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AutoConfigurationError';
  }
}

export class ServerConnectionError extends Error {
  constructor(message: string, public serverId: string, public details?: any) {
    super(message);
    this.name = 'ServerConnectionError';
  }
}

export class WorkflowGenerationError extends Error {
  constructor(message: string, public workflowId: string, public details?: any) {
    super(message);
    this.name = 'WorkflowGenerationError';
  }
}

// 유틸리티 타입들
export type ServerStatus = 'active' | 'inactive' | 'error' | 'maintenance';
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';
export type ConfigurationStatus = 'draft' | 'active' | 'archived' | 'error';
