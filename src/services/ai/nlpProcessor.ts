// AI 기반 자동 구성 시스템 - 자연어 처리 엔진
// 생성일: 2025년 8월 13일

import { IntegrationRequirement, PerformanceRequirement, Requirements, SecurityRequirement, TechnicalConstraint, UserIntent } from '../../types/ai.js';

export interface NLPProcessingResult {
  intent: UserIntent;
  requirements: Requirements;
  confidence: number;
  suggestions: string[];
  errors: string[];
}

export interface IntentExtractionResult {
  action: string;
  target: string;
  constraints: string[];
  preferences: string[];
  confidence: number;
}

export class BasicNLPProcessor {
  private readonly actionKeywords = [
    '연동', '연결', '통합', '생성', '만들기', '구축', '설정', '구성',
    '최적화', '개선', '자동화', '관리', '모니터링', '분석', '보고'
  ];

  private readonly targetKeywords = [
    'GitHub', 'Jira', 'Confluence', 'Slack', 'Discord', 'Teams',
    'PR', 'Pull Request', '이슈', '문서', '채널', '워크플로우',
    '프로젝트', '시스템', '도구', '앱', '서비스'
  ];

  private readonly constraintKeywords = [
    '보안', '성능', '속도', '안정성', '확장성', '비용', '시간',
    '규정', '정책', '표준', '호환성', '접근성', '사용성'
  ];

  private readonly preferenceKeywords = [
    '자동화', '실시간', '실시간', '배치', '스케줄링', '알림',
    '대시보드', '리포트', '로그', '백업', '복구', '모니터링'
  ];

  /**
   * 사용자 입력을 분석하여 의도를 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 의도 추출 결과
   */
  async extractIntent(input: string): Promise<UserIntent> {
    try {
      console.log(`🧠 NLP 처리 시작: "${input}"`);

      // 기본 의도 추출
      const intentResult = this.extractBasicIntent(input);

      // 제약사항 및 선호사항 추출
      const constraints = this.extractConstraints(input);
      const preferences = this.extractPreferences(input);

      // 신뢰도 계산
      const confidence = this.calculateConfidence(intentResult, constraints, preferences);

      const intent: UserIntent = {
        action: intentResult.action,
        target: intentResult.target,
        constraints,
        preferences,
        confidence
      };

      console.log(`✅ 의도 추출 완료:`, intent);
      return intent;

    } catch (error) {
      console.error(`❌ 의도 추출 실패:`, error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new Error(`의도 추출 실패: ${errorMessage}`);
    }
  }

  /**
   * 사용자 입력을 분석하여 요구사항을 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 요구사항 추출 결과
   */
  async extractRequirements(input: string): Promise<Requirements> {
    try {
      console.log(`📋 요구사항 추출 시작: "${input}"`);

      // 의도 추출
      const intent = await this.extractIntent(input);

      // 기술적 제약사항 추출
      const technicalConstraints = this.extractTechnicalConstraints(input);

      // 성능 요구사항 추출
      const performanceRequirements = this.extractPerformanceRequirements(input);

      // 보안 요구사항 추출
      const securityRequirements = this.extractSecurityRequirements(input);

      // 연동 요구사항 추출
      const integrationRequirements = this.extractIntegrationRequirements(input);

      const requirements: Requirements = {
        intent,
        technicalConstraints,
        performanceRequirements,
        securityRequirements,
        integrationRequirements
      };

      console.log(`✅ 요구사항 추출 완료:`, requirements);
      return requirements;

    } catch (error) {
      console.error(`❌ 요구사항 추출 실패:`, error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new Error(`요구사항 추출 실패: ${errorMessage}`);
    }
  }

  /**
   * 사용자 입력을 완전히 분석합니다.
   * @param input 사용자 입력 텍스트
   * @returns NLP 처리 결과
   */
  async processUserInput(input: string): Promise<NLPProcessingResult> {
    try {
      console.log(`🚀 NLP 처리 시작: "${input}"`);

      // 요구사항 추출
      const requirements = await this.extractRequirements(input);

      // 신뢰도 계산
      const confidence = requirements.intent.confidence;

      // 제안사항 생성
      const suggestions = this.generateSuggestions(requirements);

      // 에러 검증
      const errors = this.validateRequirements(requirements);

      const result: NLPProcessingResult = {
        intent: requirements.intent,
        requirements,
        confidence,
        suggestions,
        errors
      };

      console.log(`✅ NLP 처리 완료:`, result);
      return result;

    } catch (error) {
      console.error(`❌ NLP 처리 실패:`, error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new Error(`NLP 처리 실패: ${errorMessage}`);
    }
  }

  /**
   * 기본 의도를 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 기본 의도 추출 결과
   */
  private extractBasicIntent(input: string): IntentExtractionResult {
    const lowerInput = input.toLowerCase();

    // 액션 추출
    const action = this.findBestMatch(lowerInput, this.actionKeywords) || '구성';

    // 타겟 추출
    const target = this.findBestMatch(lowerInput, this.targetKeywords) || '시스템';

    // 제약사항 추출
    const constraints = this.extractConstraints(input);

    // 선호사항 추출
    const preferences = this.extractPreferences(input);

    // 신뢰도 계산
    const confidence = this.calculateBasicConfidence(lowerInput, action, target);

    return {
      action,
      target,
      constraints,
      preferences,
      confidence
    };
  }

  /**
   * 제약사항을 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 추출된 제약사항들
   */
  private extractConstraints(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const constraints: string[] = [];

    for (const keyword of this.constraintKeywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        constraints.push(keyword);
      }
    }

    return constraints;
  }

  /**
   * 선호사항을 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 추출된 선호사항들
   */
  private extractPreferences(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const preferences: string[] = [];

    for (const keyword of this.preferenceKeywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        preferences.push(keyword);
      }
    }

    return preferences;
  }

  /**
   * 기술적 제약사항을 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 기술적 제약사항들
   */
  private extractTechnicalConstraints(input: string): TechnicalConstraint[] {
    const constraints: TechnicalConstraint[] = [];
    const lowerInput = input.toLowerCase();

    // 하드웨어 제약사항
    if (lowerInput.includes('cpu') || lowerInput.includes('메모리') || lowerInput.includes('저장공간')) {
      constraints.push({
        type: 'hardware',
        description: '하드웨어 리소스 제약사항',
        severity: 'medium',
        impact: '시스템 성능에 영향'
      });
    }

    // 소프트웨어 제약사항
    if (lowerInput.includes('버전') || lowerInput.includes('라이브러리') || lowerInput.includes('의존성')) {
      constraints.push({
        type: 'software',
        description: '소프트웨어 버전 및 의존성 제약사항',
        severity: 'medium',
        impact: '호환성 및 안정성에 영향'
      });
    }

    // 네트워크 제약사항
    if (lowerInput.includes('네트워크') || lowerInput.includes('대역폭') || lowerInput.includes('지연시간')) {
      constraints.push({
        type: 'network',
        description: '네트워크 성능 및 대역폭 제약사항',
        severity: 'high',
        impact: '응답 시간 및 처리량에 직접적 영향'
      });
    }

    return constraints;
  }

  /**
   * 성능 요구사항을 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 성능 요구사항들
   */
  private extractPerformanceRequirements(input: string): PerformanceRequirement[] {
    const requirements: PerformanceRequirement[] = [];
    const lowerInput = input.toLowerCase();

    // 응답 시간 요구사항
    if (lowerInput.includes('빠른') || lowerInput.includes('즉시') || lowerInput.includes('실시간')) {
      requirements.push({
        metric: 'responseTime',
        target: 1000, // 1초
        unit: 'ms',
        priority: 'high'
      });
    }

    // 처리량 요구사항
    if (lowerInput.includes('대용량') || lowerInput.includes('많은') || lowerInput.includes('동시')) {
      requirements.push({
        metric: 'throughput',
        target: 1000, // 1000 req/sec
        unit: 'req/sec',
        priority: 'high'
      });
    }

    // 가용성 요구사항
    if (lowerInput.includes('안정적') || lowerInput.includes('중단없이') || lowerInput.includes('24/7')) {
      requirements.push({
        metric: 'availability',
        target: 99.9, // 99.9%
        unit: '%',
        priority: 'critical'
      });
    }

    return requirements;
  }

  /**
   * 보안 요구사항을 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 보안 요구사항들
   */
  private extractSecurityRequirements(input: string): SecurityRequirement[] {
    const requirements: SecurityRequirement[] = [];
    const lowerInput = input.toLowerCase();

    // 인증 요구사항
    if (lowerInput.includes('로그인') || lowerInput.includes('인증') || lowerInput.includes('계정')) {
      requirements.push({
        type: 'authentication',
        description: '사용자 인증 및 로그인 시스템',
        level: 'standard'
      });
    }

    // 암호화 요구사항
    if (lowerInput.includes('암호화') || lowerInput.includes('보안') || lowerInput.includes('개인정보')) {
      requirements.push({
        type: 'encryption',
        description: '데이터 암호화 및 보안 강화',
        level: 'high'
      });
    }

    return requirements;
  }

  /**
   * 연동 요구사항을 추출합니다.
   * @param input 사용자 입력 텍스트
   * @returns 연동 요구사항들
   */
  private extractIntegrationRequirements(input: string): IntegrationRequirement[] {
    const requirements: IntegrationRequirement[] = [];
    const lowerInput = input.toLowerCase();

    // GitHub 연동
    if (lowerInput.includes('github') || lowerInput.includes('git')) {
      requirements.push({
        system: 'GitHub',
        protocol: 'REST API',
        dataFormat: 'JSON',
        frequency: 'real-time'
      });
    }

    // Jira 연동
    if (lowerInput.includes('jira') || lowerInput.includes('이슈')) {
      requirements.push({
        system: 'Jira',
        protocol: 'REST API',
        dataFormat: 'JSON',
        frequency: 'real-time'
      });
    }

    // Slack 연동
    if (lowerInput.includes('slack') || lowerInput.includes('채널')) {
      requirements.push({
        system: 'Slack',
        protocol: 'Webhook',
        dataFormat: 'JSON',
        frequency: 'event-driven'
      });
    }

    return requirements;
  }

  /**
   * 가장 잘 매칭되는 키워드를 찾습니다.
   * @param input 사용자 입력 텍스트
   * @param keywords 키워드 목록
   * @returns 가장 잘 매칭되는 키워드
   */
  private findBestMatch(input: string, keywords: string[]): string | null {
    for (const keyword of keywords) {
      if (input.includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * 기본 신뢰도를 계산합니다.
   * @param input 사용자 입력 텍스트
   * @param action 추출된 액션
   * @param target 추출된 타겟
   * @returns 신뢰도 (0-100)
   */
  private calculateBasicConfidence(input: string, action: string, target: string): number {
    let confidence = 50; // 기본 신뢰도

    // 액션 매칭 점수
    if (input.includes(action.toLowerCase())) {
      confidence += 20;
    }

    // 타겟 매칭 점수
    if (input.includes(target.toLowerCase())) {
      confidence += 20;
    }

    // 키워드 밀도 점수
    const matchedKeywords = this.actionKeywords.filter(keyword =>
      input.includes(keyword.toLowerCase())
    ).length;
    confidence += Math.min(matchedKeywords * 5, 20);

    return Math.min(confidence, 100);
  }

  /**
   * 전체 신뢰도를 계산합니다.
   * @param intentResult 의도 추출 결과
   * @param constraints 제약사항들
   * @param preferences 선호사항들
   * @returns 신뢰도 (0-100)
   */
  private calculateConfidence(
    intentResult: IntentExtractionResult,
    constraints: string[],
    preferences: string[]
  ): number {
    let confidence = intentResult.confidence;

    // 제약사항 점수
    confidence += Math.min(constraints.length * 3, 15);

    // 선호사항 점수
    confidence += Math.min(preferences.length * 3, 15);

    return Math.min(confidence, 100);
  }

  /**
   * 제안사항을 생성합니다.
   * @param requirements 추출된 요구사항
   * @returns 제안사항들
   */
  private generateSuggestions(requirements: Requirements): string[] {
    const suggestions: string[] = [];

    // 기본 제안사항
    suggestions.push('추가적인 요구사항이나 제약사항이 있으시면 알려주세요.');

    // 성능 관련 제안사항
    if (requirements.performanceRequirements.length === 0) {
      suggestions.push('성능 요구사항(응답 시간, 처리량 등)을 명시하면 더 정확한 구성이 가능합니다.');
    }

    // 보안 관련 제안사항
    if (requirements.securityRequirements.length === 0) {
      suggestions.push('보안 요구사항(인증, 암호화 등)을 명시하면 보안을 강화할 수 있습니다.');
    }

    // 연동 관련 제안사항
    if (requirements.integrationRequirements.length === 0) {
      suggestions.push('연동할 외부 시스템이나 서비스를 명시하면 더 구체적인 구성이 가능합니다.');
    }

    return suggestions;
  }

  /**
   * 요구사항을 검증합니다.
   * @param requirements 추출된 요구사항
   * @returns 검증 에러들
   */
  private validateRequirements(requirements: Requirements): string[] {
    const errors: string[] = [];

    // 의도 검증
    if (!requirements.intent.action || requirements.intent.action === '구성') {
      errors.push('구체적인 작업 내용을 명시해주세요 (예: 연동, 생성, 최적화).');
    }

    if (!requirements.intent.target || requirements.intent.target === '시스템') {
      errors.push('구체적인 대상 시스템을 명시해주세요 (예: GitHub, Jira, Slack).');
    }

    // 신뢰도 검증
    if (requirements.intent.confidence < 50) {
      errors.push('의도를 정확히 파악하기 어렵습니다. 더 구체적으로 설명해주세요.');
    }

    return errors;
  }
}
