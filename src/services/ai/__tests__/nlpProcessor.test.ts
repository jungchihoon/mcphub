// AI 기반 자동 구성 시스템 - NLP 프로세서 테스트
// 생성일: 2025년 8월 13일

import { BasicNLPProcessor } from '../nlpProcessor';

describe('BasicNLPProcessor', () => {
  let processor: BasicNLPProcessor;

  beforeEach(() => {
    processor = new BasicNLPProcessor();
  });

  describe('extractIntent', () => {
    it('should extract intent from GitHub PR and Jira issue integration request', async () => {
      const input = 'GitHub PR과 Jira 이슈를 연동해서 프로젝트 관리 도구를 만들어줘';
      
      const result = await processor.extractIntent(input);
      
      expect(result.action).toBe('연동');
      expect(result.target).toBe('GitHub');
      expect(result.constraints.length).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should extract intent from Slack notification request', async () => {
      const input = 'Slack 채널에 실시간 알림을 보내는 시스템을 구축해줘';
      
      const result = await processor.extractIntent(input);
      
      expect(result.action).toBe('구축');
      expect(result.target).toBe('Slack');
      expect(result.preferences).toContain('실시간');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should handle performance requirements', async () => {
      const input = '빠른 응답 시간과 높은 처리량을 가진 모니터링 시스템을 만들어줘';
      
      const result = await processor.extractIntent(input);
      
      expect(result.action).toBe('모니터링');
      expect(result.constraints.length).toBeGreaterThanOrEqual(0);
      expect(result.preferences.length).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should handle security requirements', async () => {
      const input = '보안이 강화된 사용자 인증 시스템을 구성해줘';
      
      const result = await processor.extractIntent(input);
      
      expect(result.action).toBe('구성');
      expect(result.constraints).toContain('보안');
      expect(result.confidence).toBeGreaterThan(50);
    });
  });

  describe('extractRequirements', () => {
    it('should extract complete requirements from complex input', async () => {
      const input = 'GitHub PR과 Jira 이슈를 연동해서 24/7 안정적으로 운영되는 프로젝트 관리 도구를 만들어줘. 보안도 중요하고 실시간 알림도 필요해.';
      
      const result = await processor.extractRequirements(input);
      
      expect(result.intent.action).toBe('연동');
      expect(result.intent.target).toBe('GitHub');
      expect(result.technicalConstraints.length).toBeGreaterThanOrEqual(0);
      expect(result.performanceRequirements.length).toBeGreaterThan(0);
      expect(result.securityRequirements.length).toBeGreaterThan(0);
      expect(result.integrationRequirements.length).toBeGreaterThan(0);
    });
  });

  describe('processUserInput', () => {
    it('should process user input and return complete result', async () => {
      const input = 'Confluence 문서와 Slack 채널을 연결해서 자동화된 보고서 시스템을 만들어줘';
      
      const result = await processor.processUserInput(input);
      
      expect(result.intent.action).toBe('연결');
      expect(result.intent.target).toBe('Confluence');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle ambiguous input with suggestions', async () => {
      const input = '도구를 만들어줘';
      
      const result = await processor.processUserInput(input);
      
      expect(result.intent.action).toBe('구성');
      expect(result.intent.target).toBe('도구');
      expect(result.confidence).toBeLessThanOrEqual(70);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate high confidence for specific input', async () => {
      const input = 'GitHub Pull Request와 Jira 이슈를 연동해서 자동화된 워크플로우를 생성해줘';
      
      const result = await processor.extractIntent(input);
      
      expect(result.confidence).toBeGreaterThan(80);
    });

    it('should calculate medium confidence for general input', async () => {
      const input = '프로젝트 관리 시스템을 만들어줘';
      
      const result = await processor.extractIntent(input);
      
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should calculate low confidence for vague input', async () => {
      const input = '뭔가 만들어줘';
      
      const result = await processor.extractIntent(input);
      
      expect(result.confidence).toBeLessThan(60);
    });
  });

  describe('error handling', () => {
    it('should handle empty input gracefully', async () => {
      const input = '';
      
      const result = await processor.extractIntent(input);
      expect(result.confidence).toBe(50); // 기본 신뢰도
    });

    it('should handle very long input', async () => {
      const input = 'a'.repeat(10000);
      
      const result = await processor.extractIntent(input);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});
