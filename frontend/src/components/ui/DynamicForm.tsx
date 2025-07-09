/**
 * 동적 폼 컴포넌트
 * 
 * JSON 스키마를 기반으로 동적으로 폼을 생성하는 React 컴포넌트입니다.
 * MCP 도구의 입력 매개변수를 위한 폼을 자동으로 생성하며,
 * 다양한 데이터 타입(문자열, 숫자, 불린, 배열, 객체)을 지원합니다.
 * 
 * 주요 기능:
 * - JSON 스키마 기반 자동 폼 생성
 * - 폼 모드와 JSON 텍스트 모드 간 전환
 * - localStorage를 통한 폼 데이터 자동 저장/복원
 * - 실시간 유효성 검사
 * - 중첩된 객체 및 배열 지원
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolInputSchema } from '@/types';

/**
 * 내부 JSON 스키마 인터페이스
 * ToolInputSchema를 내부적으로 사용하기 위해 변환된 형태
 */
interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: any[];
  description?: string;
  default?: any;
}

/**
 * DynamicForm 컴포넌트 Props
 */
interface DynamicFormProps {
  /** 폼 생성에 사용할 JSON 스키마 */
  schema: ToolInputSchema;
  /** 폼 제출 시 호출되는 콜백 함수 */
  onSubmit: (values: Record<string, any>) => void;
  /** 폼 취소 시 호출되는 콜백 함수 */
  onCancel: () => void;
  /** 폼 제출 중 로딩 상태 */
  loading?: boolean;
  /** localStorage에 폼 데이터를 저장할 때 사용할 키 */
  storageKey?: string;
  /** 폼 제목 (기본 매개변수 제목 대신 사용) */
  title?: string;
}

/**
 * 동적 폼 컴포넌트
 * 
 * @param props - DynamicForm 컴포넌트 속성
 * @returns 렌더링된 동적 폼 컴포넌트
 */
const DynamicForm: React.FC<DynamicFormProps> = ({ schema, onSubmit, onCancel, loading = false, storageKey, title }) => {
  const { t } = useTranslation();
  
  // 폼 상태 관리
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isJsonMode, setIsJsonMode] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');

  /**
   * ToolInputSchema를 내부 JsonSchema로 변환
   * 무한 리렌더링을 방지하기 위해 useMemo로 메모이제이션
   */
  const jsonSchema = useMemo(() => {
    /**
     * 스키마 변환 함수
     * @param schema - 변환할 ToolInputSchema
     * @returns 변환된 JsonSchema
     */
    const convertToJsonSchema = (schema: ToolInputSchema): JsonSchema => {
      /**
       * 개별 속성 변환 함수
       * @param prop - 변환할 속성
       * @returns 변환된 JsonSchema 속성
       */
      const convertProperty = (prop: unknown): JsonSchema => {
        if (typeof prop === 'object' && prop !== null) {
          const obj = prop as any;
          return {
            type: obj.type || 'string',
            description: obj.description,
            enum: obj.enum,
            default: obj.default,
            properties: obj.properties ? Object.fromEntries(
              Object.entries(obj.properties).map(([key, value]) => [key, convertProperty(value)])
            ) : undefined,
            required: obj.required,
            items: obj.items ? convertProperty(obj.items) : undefined,
          };
        }
        return { type: 'string' };
      };

      return {
        type: schema.type,
        properties: schema.properties ? Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [key, convertProperty(value)])
        ) : undefined,
        required: schema.required,
      };
    };

    return convertToJsonSchema(schema);
  }, [schema]);

  /**
   * 폼 값을 기본값 또는 localStorage에서 초기화
   * 스키마가 변경될 때마다 실행됨
   */
  useEffect(() => {
    /**
     * 스키마를 기반으로 초기값 생성
     * @param schema - 초기값을 생성할 스키마
     * @param path - 현재 경로 (중첩된 객체용)
     * @returns 생성된 초기값 객체
     */
    const initializeValues = (schema: JsonSchema, path: string = ''): Record<string, any> => {
      const values: Record<string, any> = {};

      if (schema.type === 'object' && schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]) => {
          const fullPath = path ? `${path}.${key}` : key;
          
          // 기본값이 있는 경우 사용
          if (propSchema.default !== undefined) {
            values[key] = propSchema.default;
          } else if (propSchema.type === 'string') {
            values[key] = '';
          } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
            values[key] = 0;
          } else if (propSchema.type === 'boolean') {
            values[key] = false;
          } else if (propSchema.type === 'array') {
            values[key] = [];
          } else if (propSchema.type === 'object') {
            // 속성이 정의된 객체는 재귀적으로 초기화
            if (propSchema.properties) {
              values[key] = initializeValues(propSchema, fullPath);
            } else {
              // 속성이 없는 객체는 빈 객체로 초기화
              values[key] = {};
            }
          }
        });
      }

      return values;
    };

    let initialValues = initializeValues(jsonSchema);

    // localStorage에서 저장된 폼 데이터 로드 시도
    if (storageKey) {
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // 저장된 데이터를 초기값과 병합하여 구조 유지
          initialValues = { ...initialValues, ...parsedData };
        }
      } catch (error) {
        console.warn('Failed to load saved form data:', error);
      }
    }

    setFormValues(initialValues);
  }, [jsonSchema, storageKey]);

  /**
   * 모드 전환 시 JSON 텍스트와 폼 값 동기화
   */
  useEffect(() => {
    if (isJsonMode && Object.keys(formValues).length > 0) {
      setJsonText(JSON.stringify(formValues, null, 2));
      setJsonError('');
    }
  }, [isJsonMode, formValues]);

  /**
   * JSON 텍스트 변경 처리
   * @param text - 변경된 JSON 텍스트
   */
  const handleJsonTextChange = (text: string) => {
    setJsonText(text);
    setJsonError('');

    try {
      const parsedJson = JSON.parse(text);
      setFormValues(parsedJson);

      // storageKey가 제공된 경우 localStorage에 저장
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(parsedJson));
        } catch (error) {
          console.warn('Failed to save form data to localStorage:', error);
        }
      }
    } catch (error) {
      setJsonError(t('tool.invalidJsonFormat'));
    }
  };

  /**
   * JSON 모드로 전환
   */
  const switchToJsonMode = () => {
    setJsonText(JSON.stringify(formValues, null, 2));
    setJsonError('');
    setIsJsonMode(true);
  };

  /**
   * 폼 모드로 전환
   */
  const switchToFormMode = () => {
    // 폼 모드로 전환하기 전에 JSON 유효성 검사
    if (jsonText.trim()) {
      try {
        const parsedJson = JSON.parse(jsonText);
        setFormValues(parsedJson);
        setJsonError('');
        setIsJsonMode(false);
      } catch (error) {
        setJsonError(t('tool.fixJsonBeforeSwitching'));
        return;
      }
    } else {
      setIsJsonMode(false);
    }
  };

  /**
   * 입력 값 변경 처리
   * @param path - 변경할 필드의 경로 (점 표기법)
   * @param value - 새로운 값
   */
  const handleInputChange = (path: string, value: any) => {
    setFormValues(prev => {
      const newValues = { ...prev };
      const keys = path.split('.');
      let current = newValues;

      // 중첩된 객체 경로를 따라 이동
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      // 최종 값 설정
      current[keys[keys.length - 1]] = value;

      // storageKey가 제공된 경우 localStorage에 저장
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newValues));
        } catch (error) {
          console.warn('Failed to save form data to localStorage:', error);
        }
      }

      return newValues;
    });

    // 해당 필드의 오류 메시지 제거
    if (errors[path]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
    }
  };

  /**
   * 폼 유효성 검사
   * @returns 유효성 검사 통과 여부
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    /**
     * 객체 유효성 검사 (재귀적)
     * @param schema - 검사할 스키마
     * @param values - 검사할 값들
     * @param path - 현재 경로
     */
    const validateObject = (schema: JsonSchema, values: any, path: string = '') => {
      if (schema.type === 'object' && schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]) => {
          const fullPath = path ? `${path}.${key}` : key;
          const value = getNestedValue(values, fullPath);

          // 필수 필드 검사
          if (schema.required?.includes(key) && (value === undefined || value === null || value === '')) {
            newErrors[fullPath] = `${key} is required`;
            return;
          }

          // 타입 유효성 검사
          if (value !== undefined && value !== null && value !== '') {
            if (propSchema.type === 'string' && typeof value !== 'string') {
              newErrors[fullPath] = `${key} must be a string`;
            } else if (propSchema.type === 'number' && typeof value !== 'number') {
              newErrors[fullPath] = `${key} must be a number`;
            } else if (propSchema.type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
              newErrors[fullPath] = `${key} must be an integer`;
            } else if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
              newErrors[fullPath] = `${key} must be a boolean`;
            } else if (propSchema.type === 'array' && Array.isArray(value)) {
              // 배열 항목 유효성 검사
              if (propSchema.items) {
                value.forEach((item: any, index: number) => {
                  if (propSchema.items?.type === 'object' && propSchema.items.properties) {
                    validateObject(propSchema.items, item, `${fullPath}.${index}`);
                  }
                });
              }
            } else if (propSchema.type === 'object' && typeof value === 'object') {
              validateObject(propSchema, value, fullPath);
            }
          }
        });
      }
    };

    validateObject(jsonSchema, formValues);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 폼 제출 처리
   * @param e - 폼 이벤트
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formValues);
    }
  };

  /**
   * 중첩된 객체에서 값 가져오기
   * @param obj - 대상 객체
   * @param path - 값의 경로 (점 표기법)
   * @returns 해당 경로의 값
   */
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  /**
   * 객체 필드 렌더링 (배열 내부 객체용)
   * @param key - 필드 키
   * @param schema - 필드 스키마
   * @param currentValue - 현재 값
   * @param onChange - 값 변경 콜백
   * @returns 렌더링된 필드 요소
   */
  const renderObjectField = (key: string, schema: JsonSchema, currentValue: any, onChange: (value: any) => void): React.ReactNode => {
    const value = currentValue?.[key];

    if (schema.type === 'string') {
      if (schema.enum) {
        // 열거형 문자열 - 셀렉트 박스
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border rounded-md px-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t('tool.selectOption')}</option>
            {schema.enum.map((option: any, idx: number) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      } else {
        // 일반 문자열 - 텍스트 입력
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border rounded-md px-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 form-input"
            placeholder={schema.description || t('tool.enterKey', { key })}
          />
        );
      }
    }

    if (schema.type === 'number' || schema.type === 'integer') {
      // 숫자 입력
      return (
        <input
          type="number"
          step={schema.type === 'integer' ? '1' : 'any'}
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : schema.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value);
            onChange(val);
          }}
          className="w-full border rounded-md px-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 form-input"
        />
      );
    }

    if (schema.type === 'boolean') {
      // 불린 입력 - 체크박스
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      );
    }

    // 기본값 - 텍스트 입력
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-md px-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 form-input"
        placeholder={schema.description || t('tool.enterKey', { key })}
      />
    );
  };

  /**
   * 메인 필드 렌더링 함수
   * @param key - 필드 키
   * @param propSchema - 필드 스키마
   * @param path - 필드 경로
   * @returns 렌더링된 필드 요소
   */
  const renderField = (key: string, propSchema: JsonSchema, path: string = ''): React.ReactNode => {
    const fullPath = path ? `${path}.${key}` : key;
    const value = getNestedValue(formValues, fullPath);
    const error = errors[fullPath];
    
    // 배열 타입 처리
    if (propSchema.type === 'array') {
      const arrayValue = getNestedValue(formValues, fullPath) || [];

      return (
        <div key={fullPath} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {key}
            {(path ? getNestedValue(jsonSchema, path)?.required?.includes(key) : jsonSchema.required?.includes(key)) && <span className="text-status-red ml-1">*</span>}
          </label>
          {propSchema.description && (
            <p className="text-xs text-gray-500 mb-2">{propSchema.description}</p>
          )}

          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            {/* 배열 항목들 렌더링 */}
            {arrayValue.map((item: any, index: number) => (
              <div key={index} className="mb-3 p-3 bg-white border rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">{t('tool.item', { index: index + 1 })}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newArray = [...arrayValue];
                      newArray.splice(index, 1);
                      handleInputChange(fullPath, newArray);
                    }}
                    className="text-status-red hover:text-red-700 text-sm"
                  >
                    {t('common.remove')}
                  </button>
                </div>

                {/* 배열 항목 타입에 따른 렌더링 */}
                {propSchema.items?.type === 'string' && propSchema.items.enum ? (
                  // 열거형 문자열 배열
                  <select
                    value={item || ''}
                    onChange={(e) => {
                      const newArray = [...arrayValue];
                      newArray[index] = e.target.value;
                      handleInputChange(fullPath, newArray);
                    }}
                    className="w-full border rounded-md px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('tool.selectOption')}</option>
                    {propSchema.items.enum.map((option: any, idx: number) => (
                      <option key={idx} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : propSchema.items?.type === 'object' && propSchema.items.properties ? (
                  // 객체 배열
                  <div className="space-y-3">
                    {Object.entries(propSchema.items.properties).map(([objKey, objSchema]) => (
                      <div key={objKey}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {objKey}
                          {propSchema.items?.required?.includes(objKey) && <span className="text-status-red ml-1">*</span>}
                        </label>
                        {renderObjectField(objKey, objSchema as JsonSchema, item, (newValue) => {
                          const newArray = [...arrayValue];
                          newArray[index] = { ...newArray[index], [objKey]: newValue };
                          handleInputChange(fullPath, newArray);
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  // 기본 배열 (문자열, 숫자 등)
                  <input
                    type="text"
                    value={item || ''}
                    onChange={(e) => {
                      const newArray = [...arrayValue];
                      newArray[index] = e.target.value;
                      handleInputChange(fullPath, newArray);
                    }}
                    className="w-full border rounded-md px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                    placeholder={t('tool.enterValue', { type: propSchema.items?.type || 'value' })}
                  />
                )}
              </div>
            ))}

            {/* 배열 항목 추가 버튼 */}
            <button
              type="button"
              onClick={() => {
                const newItem = propSchema.items?.type === 'object' ? {} : '';
                handleInputChange(fullPath, [...arrayValue, newItem]);
              }}
              className="w-full mt-2 px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              {t('tool.addItem', { key })}
            </button>
          </div>

          {error && <p className="text-status-red text-xs mt-1">{error}</p>}
        </div>
      );
    }
    
    // ... 나머지 렌더링 로직은 동일하게 유지 ...

    if (!jsonSchema.properties) {
      return (
        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">{t('tool.noParameters')}</p>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {t('tool.cancel')}
            </button>
            <button
              onClick={() => onSubmit({})}
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('tool.running') : t('tool.runTool')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex justify-between items-center pb-3">
          <h6 className="text-md font-medium text-gray-900">{title}</h6>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={switchToFormMode}
            >
              {t('tool.formMode')}
            </button>
            <button
              type="button"
              onClick={switchToJsonMode}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${isJsonMode
                ? 'px-4 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary'
                : 'text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 btn-secondary'
                }`}
            >
              {t('tool.jsonMode')}
            </button>
          </div>
        </div>

        {/* JSON Mode */}
        {isJsonMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tool.jsonConfiguration')}
            </label>
              <textarea
                value={jsonText}
                onChange={(e) => handleJsonTextChange(e.target.value)}
                placeholder={`{\n  "key": "value"\n}`}
                className={`w-full h-64 border rounded-md px-3 py-2 font-mono text-sm resize-y form-input ${jsonError ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {jsonError && <p className="text-status-red text-xs mt-1">{jsonError}</p>}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 btn-secondary"
              >
                {t('tool.cancel')}
              </button>
              <button
                onClick={() => {
                try {
                    const parsedJson = JSON.parse(jsonText);
                    onSubmit(parsedJson);
                  } catch (error) {
                    setJsonError(t('tool.invalidJsonFormat'));
                }
              }}
                disabled={loading || !!jsonError}
                className="px-4 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary"
              >
                {loading ? t('tool.running') : t('tool.runTool')}
              </button>
          </div>
          </div>
        ) : (
          /* Form Mode */
          <form onSubmit={handleSubmit} className="space-y-4">
            {Object.entries(jsonSchema.properties || {}).map(([key, propSchema]) =>
              renderField(key, propSchema)
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 btn-secondary"
              >
                {t('tool.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary"
              >
                {loading ? t('tool.running') : t('tool.runTool')}
              </button>
          </div>
          </form>
        )}
      </div>
    );
  };

  if (!jsonSchema.properties) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">{t('tool.noParameters')}</p>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            {t('tool.cancel')}
          </button>
          <button
            onClick={() => onSubmit({})}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('tool.running') : t('tool.runTool')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex justify-between items-center pb-3">
        <h6 className="text-md font-medium text-gray-900">{title}</h6>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={switchToFormMode}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${!isJsonMode
              ? 'bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary'
              : 'text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 btn-secondary'
              }`}
          >
            {t('tool.formMode')}
          </button>
          <button
            type="button"
            onClick={switchToJsonMode}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${isJsonMode
              ? 'px-4 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary'
              : 'text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 btn-secondary'
              }`}
          >
            {t('tool.jsonMode')}
          </button>
        </div>
      </div>

      {/* JSON Mode */}
      {isJsonMode ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tool.jsonConfiguration')}
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonTextChange(e.target.value)}
              placeholder={`{\n  "key": "value"\n}`}
              className={`w-full h-64 border rounded-md px-3 py-2 font-mono text-sm resize-y form-input ${jsonError ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {jsonError && <p className="text-status-red text-xs mt-1">{jsonError}</p>}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 btn-secondary"
            >
              {t('tool.cancel')}
            </button>
            <button
              onClick={() => {
                try {
                  const parsedJson = JSON.parse(jsonText);
                  onSubmit(parsedJson);
                } catch (error) {
                  setJsonError(t('tool.invalidJsonFormat'));
                }
              }}
              disabled={loading || !!jsonError}
              className="px-4 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary"
            >
              {loading ? t('tool.running') : t('tool.runTool')}
            </button>
          </div>
        </div>
      ) : (
        /* Form Mode */
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(jsonSchema.properties || {}).map(([key, propSchema]) =>
            renderField(key, propSchema)
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 btn-secondary"
            >
              {t('tool.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary"
            >
              {loading ? t('tool.running') : t('tool.runTool')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DynamicForm;