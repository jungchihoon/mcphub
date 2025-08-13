// AI 기반 워크플로우 자동 생성 엔진 - Phase 2
// 생성일: 2025년 8월 13일
// 목적: 사용자 의도와 매칭된 MCP 서버를 기반으로 자동 워크플로우 생성

import { UserIntent, Requirements, WorkflowDefinition, WorkflowStep } from '../../../types/ai';
import { ServerMatch } from '../matching/serverMatchingEngine';

export interface WorkflowGenerationRequest {
  userIntent: UserIntent;
  matchedServers: ServerMatch[];
  requirements: Requirements;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: number; // minutes
}

export interface WorkflowGenerationResult {
  workflow: WorkflowDefinition;
  confidence: number;
  estimatedExecutionTime: number; // minutes
  prerequisites: string[];
  risks: string[];
  alternatives: WorkflowDefinition[];
  generatedAt: Date;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'simple' | 'medium' | 'complex';
  steps: WorkflowStep[];
  prerequisites: string[];
  estimatedDuration: number;
  successRate: number;
}

export class WorkflowGenerationEngine {
  private readonly workflowTemplates: Map<string, WorkflowTemplate>;
  private readonly stepGenerators: Map<string, StepGenerator>;
  private readonly validationRules: ValidationRule[];

  constructor() {
    this.workflowTemplates = new Map();
    this.stepGenerators = new Map();
    this.validationRules = [];
    this.initializeTemplates();
    this.initializeStepGenerators();
    this.initializeValidationRules();
  }

  // 🚀 워크플로우 자동 생성 메인 메서드
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResult> {
    console.log(`🔧 워크플로우 생성 시작: ${request.userIntent.action} (복잡도: ${request.complexity})`);

    try {
      // 1. 템플릿 기반 워크플로우 생성
      const templateWorkflow = await this.generateFromTemplate(request);
      
      // 2. AI 기반 커스터마이징
      const customizedWorkflow = await this.customizeWorkflow(templateWorkflow, request);
      
      // 3. 검증 및 최적화
      const validatedWorkflow = await this.validateAndOptimize(customizedWorkflow, request);
      
      // 4. 대안 워크플로우 생성
      const alternatives = await this.generateAlternatives(request, validatedWorkflow);
      
      // 5. 결과 생성
      const result: WorkflowGenerationResult = {
        workflow: validatedWorkflow,
        confidence: this.calculateWorkflowConfidence(validatedWorkflow, request),
        estimatedExecutionTime: this.estimateExecutionTime(validatedWorkflow),
        prerequisites: this.extractPrerequisites(validatedWorkflow),
        risks: this.identifyRisks(validatedWorkflow),
        alternatives,
        generatedAt: new Date()
      };

      console.log(`✅ 워크플로우 생성 완료: ${result.workflow.steps.length}개 단계, 신뢰도: ${result.confidence}%`);
      
      return result;
    } catch (error) {
      console.error('❌ 워크플로우 생성 중 오류 발생:', error);
      throw new Error(`워크플로우 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  // 📋 템플릿 기반 워크플로우 생성
  private async generateFromTemplate(request: WorkflowGenerationRequest): Promise<WorkflowDefinition> {
    const template = this.findBestTemplate(request);
    
    if (!template) {
      return this.createCustomWorkflow(request);
    }

    console.log(`📋 템플릿 사용: ${template.name} (${template.category})`);
    
    return {
      id: this.generateWorkflowId(),
      name: `${request.userIntent.action} 워크플로우`,
      description: `${request.userIntent.action}을 위한 자동 생성된 워크플로우`,
      steps: template.steps.map(step => this.adaptStep(step, request)),
      metadata: {
        template: template.id,
        complexity: request.complexity,
        generatedBy: 'AI Workflow Engine',
        version: '1.0'
      }
    };
  }

  // 🎨 워크플로우 커스터마이징
  private async customizeWorkflow(
    workflow: WorkflowDefinition, 
    request: WorkflowGenerationRequest
  ): Promise<WorkflowDefinition> {
    console.log('🎨 워크플로우 커스터마이징 시작');
    
    const customizedSteps = await Promise.all(
      workflow.steps.map(async (step, index) => {
        const generator = this.stepGenerators.get(step.type);
        if (generator) {
          return await generator.generate(step, request, index);
        }
        return step;
      })
    );

    return {
      ...workflow,
      steps: customizedSteps,
      metadata: {
        ...workflow.metadata,
        customized: true,
        customizationTimestamp: new Date()
      }
    };
  }

  // ✅ 검증 및 최적화
  private async validateAndOptimize(
    workflow: WorkflowDefinition, 
    request: WorkflowGenerationRequest
  ): Promise<WorkflowDefinition> {
    console.log('✅ 워크플로우 검증 및 최적화 시작');
    
    // 검증 규칙 적용
    for (const rule of this.validationRules) {
      const validationResult = await rule.validate(workflow, request);
      if (!validationResult.valid) {
        console.warn(`⚠️ 검증 경고: ${validationResult.message}`);
        workflow = await rule.fix(workflow, validationResult);
      }
    }

    // 성능 최적화
    workflow = this.optimizeWorkflow(workflow);
    
    return workflow;
  }

  // 🔄 대안 워크플로우 생성
  private async generateAlternatives(
    request: WorkflowGenerationRequest, 
    primaryWorkflow: WorkflowDefinition
  ): Promise<WorkflowDefinition[]> {
    const alternatives: WorkflowDefinition[] = [];
    
    // 다른 복잡도로 대안 생성
    if (request.complexity !== 'simple') {
      const simpleAlternative = await this.generateWorkflow({
        ...request,
        complexity: 'simple'
      });
      alternatives.push(simpleAlternative.workflow);
    }
    
    if (request.complexity !== 'complex') {
      const complexAlternative = await this.generateWorkflow({
        ...request,
        complexity: 'complex'
      });
      alternatives.push(complexAlternative.workflow);
    }

    return alternatives.slice(0, 2); // 최대 2개 대안
  }

  // 🎯 최적 템플릿 찾기
  private findBestTemplate(request: WorkflowGenerationRequest): WorkflowTemplate | null {
    const candidates = Array.from(this.workflowTemplates.values())
      .filter(template => 
        template.category === request.userIntent.category ||
        template.complexity === request.complexity
      )
      .sort((a, b) => b.successRate - a.successRate);

    return candidates[0] || null;
  }

  // 🔧 커스텀 워크플로우 생성
  private createCustomWorkflow(request: WorkflowGenerationRequest): WorkflowDefinition {
    console.log('🔧 커스텀 워크플로우 생성');
    
    const steps: WorkflowStep[] = [
      {
        id: 'step-1',
        name: '초기화',
        description: '워크플로우 실행 환경 초기화',
        type: 'action',
        action: 'initialize',
        parameters: { environment: 'production' },
        nextSteps: ['step-2'],
        timeout: 30000,
        retry: { enabled: true, maxRetries: 3, delay: 1000, backoff: 'exponential' }
      },
      {
        id: 'step-2',
        name: 'MCP 서버 연결',
        description: '매칭된 MCP 서버에 연결',
        type: 'action',
        action: 'connect_servers',
        parameters: { servers: request.matchedServers.map(s => s.server.serverId) },
        nextSteps: ['step-3'],
        timeout: 60000,
        retry: { enabled: true, maxRetries: 5, delay: 2000, backoff: 'exponential' }
      },
      {
        id: 'step-3',
        name: '요구사항 검증',
        description: '사용자 요구사항 검증 및 설정',
        type: 'action',
        action: 'validate_requirements',
        parameters: { requirements: request.requirements },
        nextSteps: ['step-4'],
        timeout: 45000,
        retry: { enabled: true, maxRetries: 2, delay: 5000, backoff: 'fixed' }
      },
      {
        id: 'step-4',
        name: '실행',
        description: '메인 워크플로우 실행',
        type: 'action',
        action: 'execute_main_workflow',
        parameters: { intent: request.userIntent },
        nextSteps: ['step-5'],
        timeout: 300000, // 5분
        retry: { enabled: true, maxRetries: 3, delay: 10000, backoff: 'exponential' }
      },
      {
        id: 'step-5',
        name: '결과 검증',
        description: '실행 결과 검증 및 정리',
        type: 'action',
        action: 'validate_results',
        parameters: {},
        nextSteps: [],
        timeout: 30000,
        retry: { enabled: true, maxRetries: 2, delay: 5000, backoff: 'fixed' }
      }
    ];

    return {
      id: this.generateWorkflowId(),
      name: `${request.userIntent.action} 커스텀 워크플로우`,
      description: 'AI가 자동 생성한 커스텀 워크플로우',
      steps,
      metadata: {
        template: 'custom',
        complexity: request.complexity,
        generatedBy: 'AI Workflow Engine',
        version: '1.0'
      }
    };
  }

  // 🔧 단계 적응
  private adaptStep(step: WorkflowStep, request: WorkflowGenerationRequest): WorkflowStep {
    return {
      ...step,
      parameters: {
        ...step.parameters,
        userIntent: request.userIntent,
        requirements: request.requirements,
        matchedServers: request.matchedServers.map(s => s.server.serverId)
      }
    };
  }

  // 📊 워크플로우 신뢰도 계산
  private calculateWorkflowConfidence(
    workflow: WorkflowDefinition, 
    request: WorkflowGenerationRequest
  ): number {
    let confidence = 70; // 기본 신뢰도
    
    // 매칭된 서버 수에 따른 보너스
    if (request.matchedServers.length > 0) {
      const avgScore = request.matchedServers.reduce((sum, s) => sum + s.score, 0) / request.matchedServers.length;
      confidence += Math.min(20, avgScore * 0.2);
    }
    
    // 복잡도에 따른 조정
    if (request.complexity === 'simple') confidence += 10;
    else if (request.complexity === 'complex') confidence -= 10;
    
    // 단계 수에 따른 조정
    if (workflow.steps.length <= 3) confidence += 5;
    else if (workflow.steps.length >= 8) confidence -= 5;
    
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  // ⏱️ 실행 시간 추정
  private estimateExecutionTime(workflow: WorkflowDefinition): number {
    const baseTime = workflow.steps.length * 2; // 기본 2분/단계
    const timeoutAdjustment = workflow.steps.reduce((sum, step) => sum + step.timeout, 0) / 60000; // 분 단위
    
    return Math.round(baseTime + timeoutAdjustment);
  }

  // 📋 전제조건 추출
  private extractPrerequisites(workflow: WorkflowDefinition): string[] {
    const prerequisites: string[] = [];
    
    workflow.steps.forEach(step => {
      if (step.parameters?.prerequisites) {
        prerequisites.push(...step.parameters.prerequisites);
      }
    });
    
    return [...new Set(prerequisites)]; // 중복 제거
  }

  // ⚠️ 위험 요소 식별
  private identifyRisks(workflow: WorkflowDefinition): string[] {
    const risks: string[] = [];
    
    // 타임아웃 위험
    const longTimeoutSteps = workflow.steps.filter(step => step.timeout > 120000);
    if (longTimeoutSteps.length > 0) {
      risks.push(`${longTimeoutSteps.length}개 단계에서 긴 타임아웃으로 인한 지연 위험`);
    }
    
    // 재시도 위험
    const highRetrySteps = workflow.steps.filter(step => step.retry.maxRetries > 5);
    if (highRetrySteps.length > 0) {
      risks.push(`${highRetrySteps.length}개 단계에서 과도한 재시도로 인한 리소스 소모 위험`);
    }
    
    // 복잡성 위험
    if (workflow.steps.length > 10) {
      risks.push('복잡한 워크플로우로 인한 디버깅 및 유지보수 어려움');
    }
    
    return risks;
  }

  // 🚀 워크플로우 최적화
  private optimizeWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
    // 병렬 실행 가능한 단계 식별
    const parallelSteps = this.identifyParallelSteps(workflow.steps);
    
    // 타임아웃 최적화
    const optimizedSteps = workflow.steps.map(step => this.optimizeStep(step));
    
    return {
      ...workflow,
      steps: optimizedSteps,
      metadata: {
        ...workflow.metadata,
        optimized: true,
        optimizationTimestamp: new Date(),
        parallelSteps
      }
    };
  }

  // 🔄 병렬 실행 단계 식별
  private identifyParallelSteps(steps: WorkflowStep[]): string[][] {
    const parallelGroups: string[][] = [];
    const independentSteps = steps.filter(step => 
      !step.parameters?.dependencies || step.parameters.dependencies.length === 0
    );
    
    if (independentSteps.length > 1) {
      parallelGroups.push(independentSteps.map(s => s.id));
    }
    
    return parallelGroups;
  }

  // ⚡ 단계 최적화
  private optimizeStep(step: WorkflowStep): WorkflowStep {
    // 타임아웃 최적화
    let optimizedTimeout = step.timeout;
    if (step.timeout > 300000) { // 5분 이상
      optimizedTimeout = Math.min(step.timeout, 300000);
    }
    
    // 재시도 최적화
    let optimizedRetry = step.retry;
    if (step.retry.maxRetries > 5) {
      optimizedRetry = { ...step.retry, maxRetries: 5 };
    }
    
    return {
      ...step,
      timeout: optimizedTimeout,
      retry: optimizedRetry
    };
  }

  // 🆔 워크플로우 ID 생성
  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 📋 템플릿 초기화
  private initializeTemplates(): void {
    // 간단한 워크플로우 템플릿
    this.workflowTemplates.set('simple-connection', {
      id: 'simple-connection',
      name: '간단한 연결 워크플로우',
      description: 'MCP 서버에 간단히 연결하는 기본 워크플로우',
      category: 'connection',
      complexity: 'simple',
      steps: [
        {
          id: 'connect',
          name: '서버 연결',
          description: 'MCP 서버에 연결',
          type: 'action',
          action: 'connect',
          parameters: {},
          nextSteps: [],
          timeout: 30000,
          retry: { enabled: true, maxRetries: 3, delay: 1000, backoff: 'exponential' }
        }
      ],
      prerequisites: ['MCP 서버 활성화'],
      estimatedDuration: 1,
      successRate: 95
    });

    // 중간 복잡도 워크플로우 템플릿
    this.workflowTemplates.set('medium-integration', {
      id: 'medium-integration',
      name: '중간 복잡도 통합 워크플로우',
      description: '여러 MCP 서버를 통합하는 워크플로우',
      category: 'integration',
      complexity: 'medium',
      steps: [
        {
          id: 'validate',
          name: '환경 검증',
          description: '실행 환경 검증',
          type: 'action',
          action: 'validate_environment',
          parameters: {},
          nextSteps: ['connect'],
          timeout: 15000,
          retry: { enabled: true, maxRetries: 2, delay: 2000, backoff: 'fixed' }
        },
        {
          id: 'connect',
          name: '서버 연결',
          description: 'MCP 서버들에 연결',
          type: 'action',
          action: 'connect_multiple',
          parameters: {},
          nextSteps: ['test'],
          timeout: 60000,
          retry: { enabled: true, maxRetries: 3, delay: 5000, backoff: 'exponential' }
        },
        {
          id: 'test',
          name: '연결 테스트',
          description: '연결 상태 테스트',
          type: 'action',
          action: 'test_connections',
          parameters: {},
          nextSteps: [],
          timeout: 30000,
          retry: { enabled: true, maxRetries: 2, delay: 3000, backoff: 'fixed' }
        }
      ],
      prerequisites: ['MCP 서버 활성화', '네트워크 연결'],
      estimatedDuration: 3,
      successRate: 88
    });
  }

  // 🔧 단계 생성기 초기화
  private initializeStepGenerators(): void {
    this.stepGenerators.set('action', {
      generate: async (step, request, index) => ({
        ...step,
        parameters: {
          ...step.parameters,
          stepIndex: index,
          totalSteps: request.matchedServers.length
        }
      })
    });
  }

  // ✅ 검증 규칙 초기화
  private initializeValidationRules(): void {
    this.validationRules.push({
      name: '타임아웃 검증',
      validate: async (workflow) => {
        const longSteps = workflow.steps.filter(step => step.timeout > 300000);
        return {
          valid: longSteps.length === 0,
          message: `${longSteps.length}개 단계에서 5분 이상의 타임아웃이 설정되어 있습니다.`
        };
      },
      fix: async (workflow, result) => {
        const fixedSteps = workflow.steps.map(step => 
          step.timeout > 300000 
            ? { ...step, timeout: 300000 }
            : step
        );
        return { ...workflow, steps: fixedSteps };
      }
    });
  }
}

// 🔧 단계 생성기 인터페이스
interface StepGenerator {
  generate(step: WorkflowStep, request: WorkflowGenerationRequest, index: number): Promise<WorkflowStep>;
}

// ✅ 검증 규칙 인터페이스
interface ValidationRule {
  name: string;
  validate(workflow: WorkflowDefinition, request: WorkflowGenerationRequest): Promise<ValidationResult>;
  fix(workflow: WorkflowDefinition, result: ValidationResult): Promise<WorkflowDefinition>;
}

interface ValidationResult {
  valid: boolean;
  message: string;
}

export default WorkflowGenerationEngine;
