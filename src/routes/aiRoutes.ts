// AI 기반 자동 구성 시스템 - API 라우터
// 생성일: 2025년 8월 13일

import { Router, Request, Response } from 'express';
import { BasicNLPProcessor } from '../services/ai/nlpProcessor';
import { AutoConfigurationError } from '../types/ai';

const router = Router();
const nlpProcessor = new BasicNLPProcessor();

/**
 * @route POST /api/ai/configure
 * @desc 사용자 입력을 분석하여 AI 기반 자동 구성 결과를 반환
 * @access Public
 */
router.post('/configure', async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;

    // 입력 검증
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: '사용자 입력이 필요합니다.',
        code: 'MISSING_INPUT'
      });
    }

    if (userInput.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '사용자 입력이 비어있습니다.',
        code: 'EMPTY_INPUT'
      });
    }

    if (userInput.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '사용자 입력이 너무 깁니다. (최대 1000자)',
        code: 'INPUT_TOO_LONG'
      });
    }

    console.log(`🚀 AI 자동 구성 요청 수신: "${userInput}"`);

    // NLP 처리
    const nlpResult = await nlpProcessor.processUserInput(userInput);

    // 응답 생성
    const response = {
      success: true,
      data: {
        userInput,
        intent: nlpResult.intent,
        requirements: nlpResult.requirements,
        confidence: nlpResult.confidence,
        suggestions: nlpResult.suggestions,
        errors: nlpResult.errors,
        timestamp: new Date().toISOString()
      },
      message: 'AI 자동 구성 분석이 완료되었습니다.'
    };

    console.log(`✅ AI 자동 구성 완료: 신뢰도 ${nlpResult.confidence}%`);
    res.status(200).json(response);

  } catch (error) {
    console.error(`❌ AI 자동 구성 실패:`, error);

    if (error instanceof AutoConfigurationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details
      });
    }

    res.status(500).json({
      success: false,
      error: 'AI 자동 구성 처리 중 오류가 발생했습니다.',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/ai/intent
 * @desc 사용자 입력에서 의도만 추출
 * @access Public
 */
router.post('/intent', async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;

    // 입력 검증
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: '사용자 입력이 필요합니다.',
        code: 'MISSING_INPUT'
      });
    }

    console.log(`🧠 의도 추출 요청 수신: "${userInput}"`);

    // 의도 추출
    const intent = await nlpProcessor.extractIntent(userInput);

    const response = {
      success: true,
      data: {
        userInput,
        intent,
        timestamp: new Date().toISOString()
      },
      message: '의도 추출이 완료되었습니다.'
    };

    console.log(`✅ 의도 추출 완료: ${intent.action} -> ${intent.target}`);
    res.status(200).json(response);

  } catch (error) {
    console.error(`❌ 의도 추출 실패:`, error);

    res.status(500).json({
      success: false,
      error: '의도 추출 처리 중 오류가 발생했습니다.',
      code: 'INTENT_EXTRACTION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/ai/requirements
 * @desc 사용자 입력에서 요구사항 추출
 * @access Public
 */
router.post('/requirements', async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;

    // 입력 검증
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: '사용자 입력이 필요합니다.',
        code: 'MISSING_INPUT'
      });
    }

    console.log(`📋 요구사항 추출 요청 수신: "${userInput}"`);

    // 요구사항 추출
    const requirements = await nlpProcessor.extractRequirements(userInput);

    const response = {
      success: true,
      data: {
        userInput,
        requirements,
        timestamp: new Date().toISOString()
      },
      message: '요구사항 추출이 완료되었습니다.'
    };

    console.log(`✅ 요구사항 추출 완료: ${requirements.intent.action} -> ${requirements.intent.target}`);
    res.status(200).json(response);

  } catch (error) {
    console.error(`❌ 요구사항 추출 실패:`, error);

    res.status(500).json({
      success: false,
      error: '요구사항 추출 처리 중 오류가 발생했습니다.',
      code: 'REQUIREMENTS_EXTRACTION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/ai/health
 * @desc AI 서비스 상태 확인
 * @access Public
 */
router.get('/health', (req: Request, res: Response) => {
  const health = {
    success: true,
    service: 'AI Auto-Configuration Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(health);
});

/**
 * @route GET /api/ai/capabilities
 * @desc AI 서비스가 지원하는 기능들 조회
 * @access Public
 */
router.get('/capabilities', (req: Request, res: Response) => {
  const capabilities = {
    success: true,
    data: {
      supportedActions: [
        '연동', '연결', '통합', '생성', '만들기', '구축', '설정', '구성',
        '최적화', '개선', '자동화', '관리', '모니터링', '분석', '보고'
      ],
      supportedTargets: [
        'GitHub', 'Jira', 'Confluence', 'Slack', 'Discord', 'Teams',
        'PR', 'Pull Request', '이슈', '문서', '채널', '워크플로우',
        '프로젝트', '시스템', '도구', '앱', '서비스'
      ],
      supportedConstraints: [
        '보안', '성능', '속도', '안정성', '확장성', '비용', '시간',
        '규정', '정책', '표준', '호환성', '접근성', '사용성'
      ],
      supportedPreferences: [
        '자동화', '실시간', '배치', '스케줄링', '알림',
        '대시보드', '리포트', '로그', '백업', '복구', '모니터링'
      ],
      maxInputLength: 1000,
      supportedLanguages: ['ko', 'en'],
      confidenceThreshold: 50
    },
    message: 'AI 서비스 기능 정보를 조회했습니다.'
  };

  res.status(200).json(capabilities);
});

/**
 * @route POST /api/ai/validate
 * @desc 사용자 입력 유효성 검사
 * @access Public
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;

    // 입력 검증
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: '사용자 입력이 필요합니다.',
        code: 'MISSING_INPUT'
      });
    }

    console.log(`🔍 입력 유효성 검사 요청: "${userInput}"`);

    // 요구사항 추출 및 검증
    const requirements = await nlpProcessor.extractRequirements(userInput);
    const errors = requirements.intent.confidence < 50 ? ['의도를 정확히 파악하기 어렵습니다.'] : [];

    const validation = {
      isValid: errors.length === 0,
      confidence: requirements.intent.confidence,
      errors,
      suggestions: requirements.intent.confidence < 70 ? [
        '더 구체적인 작업 내용을 명시해주세요.',
        '대상 시스템을 명확히 해주세요.',
        '제약사항이나 선호사항을 추가해주세요.'
      ] : []
    };

    const response = {
      success: true,
      data: {
        userInput,
        validation,
        timestamp: new Date().toISOString()
      },
      message: '입력 유효성 검사가 완료되었습니다.'
    };

    console.log(`✅ 입력 유효성 검사 완료: ${validation.isValid ? '유효' : '유효하지 않음'}`);
    res.status(200).json(response);

  } catch (error) {
    console.error(`❌ 입력 유효성 검사 실패:`, error);

    res.status(500).json({
      success: false,
      error: '입력 유효성 검사 처리 중 오류가 발생했습니다.',
      code: 'VALIDATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
