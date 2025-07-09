/**
 * 클래스명 조합 유틸리티
 * 
 * Tailwind CSS 클래스를 조건부로 결합하고 중복을 제거하는 유틸리티입니다.
 * clsx와 tailwind-merge를 조합하여 더 효율적인 클래스명 관리를 제공합니다.
 * 
 * 주요 기능:
 * - 조건부 클래스명 결합
 * - Tailwind CSS 클래스 중복 제거
 * - 충돌하는 유틸리티 클래스 자동 해결
 * - 배열, 객체, 문자열 등 다양한 입력 형식 지원
 */

import { ClassValue, clsx } from 'clsx';

// tailwind-merge: Tailwind CSS 클래스들을 중복 제거하고 충돌을 해결하는 라이브러리
// 같은 속성의 클래스가 있을 때 마지막에 오는 클래스가 우선순위를 가집니다
import { twMerge } from 'tailwind-merge';

/**
 * 여러 클래스명을 결합하고 Tailwind CSS 클래스를 중복 제거합니다
 * 
 * 이 함수는 조건부로 클래스명을 결합하는 유틸리티 함수입니다.
 * clsx를 사용하여 다양한 형태의 클래스 값을 처리하고,
 * tailwind-merge를 사용하여 충돌하는 Tailwind 클래스를 해결합니다.
 * 
 * @param {...ClassValue[]} inputs - 결합할 클래스 값들 (문자열, 객체, 배열 등)
 * @returns {string} 결합되고 중복이 제거된 클래스명 문자열
 * 
 * @example
 * ```typescript
 * // 기본 사용법
 * cn('px-2 py-1', 'text-sm') // "px-2 py-1 text-sm"
 * 
 * // 조건부 클래스
 * cn('base-class', { 'active-class': isActive, 'disabled-class': isDisabled })
 * 
 * // Tailwind 충돌 해결
 * cn('px-2 py-1', 'p-4') // "py-1 p-4" (px-2는 p-4에 의해 오버라이드됨)
 * 
 * // 배열과 혼합 사용
 * cn(['base', 'other'], { conditional: true }, 'additional')
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  // 1. clsx로 모든 클래스들을 결합 (조건부 클래스 처리)
  // 2. twMerge로 Tailwind CSS 클래스 중복 제거 및 충돌 해결
  return twMerge(clsx(inputs));
}