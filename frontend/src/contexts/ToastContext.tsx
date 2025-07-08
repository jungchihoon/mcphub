// React 라이브러리와 필요한 훅들을 가져옵니다
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// 토스트 컴포넌트와 타입을 가져옵니다
import Toast, { ToastType } from '@/components/ui/Toast';

/**
 * 토스트 컨텍스트 속성 인터페이스
 * 
 * 토스트 컨텍스트에서 제공하는 함수들의 타입을 정의합니다.
 */
interface ToastContextProps {
  showToast: (message: string, type?: ToastType, duration?: number) => void;  // 토스트 표시 함수
}

/**
 * 토스트 컨텍스트 생성
 * 
 * React Context API를 사용하여 전역 토스트 알림 상태를 관리합니다.
 * undefined로 초기화하여 Provider 없이 사용할 때 오류를 발생시킵니다.
 */
const ToastContext = createContext<ToastContextProps | undefined>(undefined);

/**
 * 토스트 컨텍스트를 사용하기 위한 커스텀 훅
 * 
 * 이 훅을 사용하면 어떤 컴포넌트에서든 토스트 알림을 표시할 수 있습니다.
 * Provider 없이 사용하면 오류를 발생시켜 올바른 사용을 강제합니다.
 * 
 * @returns 토스트 컨텍스트 값들 (showToast 함수)
 * @throws Error - Provider 없이 사용할 때
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * 토스트 제공자 속성 인터페이스
 */
interface ToastProviderProps {
  children: ReactNode;  // 토스트 제공자로 감싸진 하위 컴포넌트들
}

/**
 * 토스트 제공자 컴포넌트
 * 
 * 이 컴포넌트는 애플리케이션의 모든 하위 컴포넌트들에게
 * 토스트 알림 기능을 제공합니다.
 * 
 * @param children - ToastProvider로 감싸진 하위 컴포넌트들
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // 토스트 상태를 관리하는 state
  // 토스트의 메시지, 타입, 표시 여부, 지속 시간을 포함합니다
  const [toast, setToast] = useState<{
    message: string;    // 표시할 메시지
    type: ToastType;    // 토스트 타입 (info, success, warning, error)
    visible: boolean;   // 표시 여부
    duration: number;   // 지속 시간 (밀리초)
  }>({
    message: '',
    type: 'info',
    visible: false,
    duration: 3000,  // 기본 3초
  });

  /**
   * 토스트를 표시하는 함수
   * 
   * 이 함수는 useCallback으로 메모이제이션되어 불필요한 리렌더링을 방지합니다.
   * 
   * @param message - 표시할 메시지
   * @param type - 토스트 타입 (기본값: 'info')
   * @param duration - 지속 시간 (기본값: 3000ms)
   */
  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToast({
      message,
      type,
      visible: true,
      duration,
    });
  }, []);

  /**
   * 토스트를 숨기는 함수
   * 
   * 토스트의 visible 속성만 false로 변경하여 토스트를 숨깁니다.
   * 이 함수는 useCallback으로 메모이제이션되어 있습니다.
   */
  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // 컨텍스트 제공자로 하위 컴포넌트들에게 토스트 기능을 제공
  // Toast 컴포넌트는 항상 렌더링되지만 visible 속성에 따라 표시/숨김을 제어합니다
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onClose={hideToast}
        visible={toast.visible}
      />
    </ToastContext.Provider>
  );
};