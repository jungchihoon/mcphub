/**
 * 스마트 라우팅 설정 유틸리티
 * 
 * MCP 서버의 스마트 라우팅 기능에 필요한 설정을 관리하는 유틸리티입니다.
 * 환경 변수와 설정 파일에서 구성 정보를 읽어오고 우선순위에 따라 처리합니다.
 * 
 * 주요 기능:
 * - 다중 소스에서 설정 값 우선순위 처리
 * - 환경 변수 타입 변환 및 검증
 * - OpenAI API 설정 관리
 * - 데이터베이스 연결 설정
 * - 불린 값 파싱 및 정규화
 */

import { loadSettings, expandEnvVars } from '../config/index.js';

/**
 * 스마트 라우팅 설정 인터페이스
 * 
 * 스마트 라우팅에 필요한 모든 설정 항목을 정의합니다.
 */
export interface SmartRoutingConfig {
  /** 스마트 라우팅 활성화 여부 */
  enabled: boolean;
  /** 데이터베이스 연결 URL */
  dbUrl: string;
  /** OpenAI API 기본 URL */
  openaiApiBaseUrl: string;
  /** OpenAI API 키 */
  openaiApiKey: string;
  /** OpenAI 임베딩 모델명 */
  openaiApiEmbeddingModel: string;
}

/**
 * 환경 변수와 설정에서 완전한 스마트 라우팅 설정을 가져옵니다
 *
 * 각 설정의 우선순위 순서:
 * 1. 특정 환경 변수 (ENABLE_SMART_ROUTING, SMART_ROUTING_ENABLED 등)
 * 2. 일반 환경 변수 (OPENAI_API_KEY, DATABASE_URL 등)
 * 3. 설정 구성 (systemConfig.smartRouting)
 * 4. 기본값
 *
 * @returns {SmartRoutingConfig} 완전한 스마트 라우팅 설정
 * 
 * @example
 * ```typescript
 * const config = getSmartRoutingConfig();
 * if (config.enabled) {
 *   // 스마트 라우팅 초기화
 *   initializeSmartRouting(config);
 * }
 * ```
 */
export function getSmartRoutingConfig(): SmartRoutingConfig {
  const settings = loadSettings();
  const smartRoutingSettings: Partial<SmartRoutingConfig> =
    settings.systemConfig?.smartRouting || {};

  return {
    // 활성화 상태 - 여러 환경 변수 확인
    enabled: getConfigValue(
      [process.env.SMART_ROUTING_ENABLED],
      smartRoutingSettings.enabled,
      false,
      parseBooleanEnvVar,
    ),

    // 데이터베이스 설정
    dbUrl: getConfigValue([process.env.DATABASE_URL], smartRoutingSettings.dbUrl, '', expandEnvVars),

    // OpenAI API 설정
    openaiApiBaseUrl: getConfigValue(
      [process.env.OPENAI_API_BASE_URL],
      smartRoutingSettings.openaiApiBaseUrl,
      'https://api.openai.com/v1',
      expandEnvVars,
    ),

    openaiApiKey: getConfigValue(
      [process.env.OPENAI_API_KEY],
      smartRoutingSettings.openaiApiKey,
      '',
      expandEnvVars,
    ),

    openaiApiEmbeddingModel: getConfigValue(
      [process.env.OPENAI_API_EMBEDDING_MODEL],
      smartRoutingSettings.openaiApiEmbeddingModel,
      'text-embedding-3-small',
      expandEnvVars,
    ),
  };
}

/**
 * 우선순위에 따라 설정 값을 가져옵니다: 환경 변수 > 설정 > 기본값
 *
 * @param {(string | undefined)[]} envVars - 순서대로 확인할 환경 변수명 배열
 * @param {any} settingsValue - 설정 구성에서 가져온 값
 * @param {any} defaultValue - 다른 값이 없을 때 사용할 기본값
 * @param {Function} transformer - 최종 값을 올바른 타입으로 변환하는 함수
 * @returns {any} 적절한 변환이 적용된 설정 값
 * 
 * @example
 * ```typescript
 * const apiKey = getConfigValue(
 *   [process.env.API_KEY, process.env.OPENAI_KEY],
 *   settings.apiKey,
 *   '',
 *   (value) => value.toString()
 * );
 * ```
 */
function getConfigValue<T>(
  envVars: (string | undefined)[],
  settingsValue: any,
  defaultValue: T,
  transformer: (value: any) => T,
): T {
  // 환경 변수를 순서대로 확인
  for (const envVar of envVars) {
    if (envVar !== undefined && envVar !== null && envVar !== '') {
      try {
        return transformer(envVar);
      } catch (error) {
        console.warn(`Failed to transform environment variable "${envVar}":`, error);
        continue;
      }
    }
  }

  // 설정 값 확인
  if (settingsValue !== undefined && settingsValue !== null) {
    try {
      return transformer(settingsValue);
    } catch (error) {
      console.warn('Failed to transform settings value:', error);
    }
  }

  // 기본값 반환
  return defaultValue;
}

/**
 * 문자열 환경 변수 값을 불린으로 파싱합니다
 * 
 * 일반적인 불린 표현을 지원합니다: true/false, 1/0, yes/no, on/off
 *
 * @param {string} value - 파싱할 환경 변수 값
 * @returns {boolean} 파싱된 불린 값
 * 
 * @example
 * ```typescript
 * parseBooleanEnvVar('true')   // true
 * parseBooleanEnvVar('1')      // true
 * parseBooleanEnvVar('yes')    // true
 * parseBooleanEnvVar('on')     // true
 * parseBooleanEnvVar('false')  // false
 * parseBooleanEnvVar('0')      // false
 * parseBooleanEnvVar('no')     // false
 * parseBooleanEnvVar('off')    // false
 * ```
 */
function parseBooleanEnvVar(value: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.toLowerCase().trim();

  // 일반적인 참 값 처리
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  // 일반적인 거짓 값 처리
  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'no' ||
    normalized === 'off' ||
    normalized === ''
  ) {
    return false;
  }

  // 인식되지 않는 값에 대해 기본적으로 false 반환
  console.warn(`Unrecognized boolean value for smart routing: "${value}", defaulting to false`);
  return false;
}
