// React 훅들을 가져옵니다
import { useState, useRef, useEffect } from 'react'

// 다국어 지원을 위한 react-i18next 훅을 가져옵니다
import { useTranslation } from 'react-i18next'

// 타입 정의와 아이콘 컴포넌트들을 가져옵니다
import { Server } from '@/types'
import { ChevronDown, ChevronRight, AlertCircle, Copy, Check } from 'lucide-react'

// UI 컴포넌트들과 컨텍스트를 가져옵니다
import { StatusBadge } from '@/components/ui/Badge'
import ToolCard from '@/components/ui/ToolCard'
import DeleteDialog from '@/components/ui/DeleteDialog'
import { useToast } from '@/contexts/ToastContext'

/**
 * 서버 카드 속성 인터페이스
 * 
 * 이 컴포넌트가 받을 수 있는 속성들을 정의합니다.
 */
interface ServerCardProps {
  server: Server;  // 표시할 서버 정보
  onRemove: (serverName: string) => void;  // 서버 삭제 콜백
  onEdit: (server: Server) => void;  // 서버 편집 콜백
  onToggle?: (server: Server, enabled: boolean) => Promise<boolean>;  // 서버 활성화/비활성화 콜백 (선택사항)
  onRefresh?: () => void;  // 새로고침 콜백 (선택사항)
}

/**
 * 서버 카드 컴포넌트
 * 
 * 이 컴포넌트는 개별 서버의 정보를 카드 형태로 표시합니다.
 * 서버의 상태, 도구 목록, 오류 정보를 표시하고 편집/삭제 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 서버 정보 표시 (이름, 상태, 도구 수)
 * - 서버 활성화/비활성화 토글
 * - 서버 편집 및 삭제
 * - 도구 목록 확장/축소
 * - 오류 정보 표시 및 복사
 * - 도구 활성화/비활성화
 * 
 * @param server - 표시할 서버 정보
 * @param onRemove - 삭제 콜백
 * @param onEdit - 편집 콜백
 * @param onToggle - 활성화/비활성화 콜백
 * @param onRefresh - 새로고침 콜백
 */
const ServerCard = ({ server, onRemove, onEdit, onToggle, onRefresh }: ServerCardProps) => {
  // 다국어 지원 훅 사용
  const { t } = useTranslation()
  
  // 토스트 알림 훅 사용
  const { showToast } = useToast()
  
  // 컴포넌트 상태 관리
  const [isExpanded, setIsExpanded] = useState(false)  // 도구 목록 확장 여부
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)  // 삭제 확인 다이얼로그 표시 여부
  const [isToggling, setIsToggling] = useState(false)  // 활성화/비활성화 처리 중 상태
  const [showErrorPopover, setShowErrorPopover] = useState(false)  // 오류 팝오버 표시 여부
  const [copied, setCopied] = useState(false)  // 오류 복사 완료 상태
  
  // 오류 팝오버 참조 (외부 클릭 감지용)
  const errorPopoverRef = useRef<HTMLDivElement>(null)

  /**
   * 외부 클릭 감지 이벤트 리스너
   * 
   * 오류 팝오버 외부를 클릭했을 때 팝오버를 닫습니다.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (errorPopoverRef.current && !errorPopoverRef.current.contains(event.target as Node)) {
        setShowErrorPopover(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  /**
   * 삭제 버튼 클릭 처리 함수
   * 
   * 삭제 버튼을 클릭했을 때 호출됩니다.
   * 이벤트 전파를 막고 삭제 확인 다이얼로그를 표시합니다.
   * 
   * @param e - 클릭 이벤트
   */
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  /**
   * 편집 버튼 클릭 처리 함수
   * 
   * 편집 버튼을 클릭했을 때 호출됩니다.
   * 이벤트 전파를 막고 편집 콜백을 호출합니다.
   * 
   * @param e - 클릭 이벤트
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(server)
  }

  /**
   * 활성화/비활성화 토글 처리 함수
   * 
   * 활성화/비활성화 버튼을 클릭했을 때 호출됩니다.
   * 서버의 현재 상태를 반전시킵니다.
   * 
   * @param e - 클릭 이벤트
   */
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isToggling || !onToggle) return

    setIsToggling(true)
    try {
      await onToggle(server, !(server.enabled !== false))
    } finally {
      setIsToggling(false)
    }
  }

  /**
   * 오류 아이콘 클릭 처리 함수
   * 
   * 오류 아이콘을 클릭했을 때 호출됩니다.
   * 오류 팝오버의 표시/숨김을 토글합니다.
   * 
   * @param e - 클릭 이벤트
   */
  const handleErrorIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowErrorPopover(!showErrorPopover)
  }

  /**
   * 오류 메시지를 클립보드에 복사하는 함수
   * 
   * 최신 브라우저에서는 Clipboard API를 사용하고,
   * 지원하지 않는 경우 fallback으로 document.execCommand를 사용합니다.
   * 
   * @param e - 클릭 이벤트
   */
  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!server.error) return

    if (navigator.clipboard && window.isSecureContext) {
      // 최신 브라우저용 Clipboard API 사용
      navigator.clipboard.writeText(server.error).then(() => {
        setCopied(true)
        showToast(t('common.copySuccess') || 'Copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)  // 2초 후 복사 완료 상태 해제
      })
    } else {
      // HTTP 환경이나 지원하지 않는 브라우저용 fallback
      const textArea = document.createElement('textarea')
      textArea.value = server.error
      // 스크롤 방지를 위한 스타일 설정
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        showToast(t('common.copySuccess') || 'Copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        showToast(t('common.copyFailed') || 'Copy failed', 'error')
        console.error('Copy to clipboard failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  /**
   * 삭제 확인 처리 함수
   * 
   * 삭제 확인 다이얼로그에서 확인 버튼을 클릭했을 때 호출됩니다.
   */
  const handleConfirmDelete = () => {
    onRemove(server.name)
    setShowDeleteDialog(false)
  }

  /**
   * 도구 활성화/비활성화 처리 함수
   * 
   * 도구 카드에서 토글 버튼을 클릭했을 때 호출됩니다.
   * 동적으로 toolService를 가져와서 도구 상태를 변경합니다.
   * 
   * @param toolName - 도구 이름
   * @param enabled - 활성화 여부
   */
  const handleToolToggle = async (toolName: string, enabled: boolean) => {
    try {
      const { toggleTool } = await import('@/services/toolService')
      const result = await toggleTool(server.name, toolName, enabled)

      if (result.success) {
        showToast(
          t(enabled ? 'tool.enableSuccess' : 'tool.disableSuccess', { name: toolName }),
          'success'
        )
        // UI 업데이트를 위해 새로고침 트리거
        if (onRefresh) {
          onRefresh()
        }
      } else {
        showToast(result.error || t('tool.toggleFailed'), 'error')
      }
    } catch (error) {
      console.error('Error toggling tool:', error)
      showToast(t('tool.toggleFailed'), 'error')
    }
  }

  return (
    <>
      {/* 서버 카드 메인 컨테이너 */}
      <div className={`bg-white shadow rounded-lg p-6 mb-6 page-card transition-all duration-200 ${server.enabled === false ? 'opacity-60' : ''}`}>
        {/* 카드 헤더 - 클릭 가능한 영역 */}
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* 왼쪽 영역 - 서버 정보 */}
          <div className="flex items-center space-x-3">
            {/* 서버 이름 */}
            <h2 className={`text-xl font-semibold ${server.enabled === false ? 'text-gray-600' : 'text-gray-900'}`}>{server.name}</h2>
            
            {/* 서버 상태 배지 */}
            <StatusBadge status={server.status} />

            {/* 도구 수 표시 */}
            <div className="flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm btn-primary">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>{server.tools?.length || 0} {t('server.tools')}</span>
            </div>

            {/* 오류 아이콘 및 팝오버 */}
            {server.error && (
              <div className="relative">
                <div
                  className="cursor-pointer"
                  onClick={handleErrorIconClick}
                  aria-label={t('server.viewErrorDetails')}
                >
                  <AlertCircle className="text-red-500 hover:text-red-600" size={18} />
                </div>

                {/* 오류 상세 정보 팝오버 */}
                {showErrorPopover && (
                  <div
                    ref={errorPopoverRef}
                    className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-0 w-120"
                    style={{
                      left: '-231px',
                      top: '24px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      width: '480px',
                      transform: 'translateX(50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 팝오버 헤더 */}
                    <div className="flex justify-between items-center sticky top-0 bg-white py-2 px-4 border-b border-gray-200 z-20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-red-600">{t('server.errorDetails')}</h4>
                        {/* 오류 복사 버튼 */}
                        <button
                          onClick={copyToClipboard}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors btn-secondary"
                          title={t('common.copy')}
                        >
                          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      {/* 닫기 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowErrorPopover(false)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                    {/* 오류 내용 */}
                    <div className="p-4 pt-2">
                      <pre className="text-sm text-gray-700 break-words whitespace-pre-wrap">{server.error}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 오른쪽 영역 - 액션 버튼들 */}
          <div className="flex space-x-2">
            {/* 편집 버튼 */}
            <button
              onClick={handleEdit}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm btn-primary"
            >
              {t('server.edit')}
            </button>
            
            {/* 활성화/비활성화 버튼 */}
            <div className="flex items-center">
              <button
                onClick={handleToggle}
                className={`px-3 py-1 text-sm rounded transition-colors ${isToggling
                  ? 'bg-gray-200 text-gray-500'
                  : server.enabled !== false
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 btn-secondary'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 btn-primary'
                  }`}
                disabled={isToggling}
              >
                {isToggling
                  ? t('common.processing')
                  : server.enabled !== false
                    ? t('server.disable')
                    : t('server.enable')
                }
              </button>
            </div>
            
            {/* 삭제 버튼 */}
            <button
              onClick={handleRemove}
              className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm btn-danger"
            >
              {t('server.delete')}
            </button>
            
            {/* 확장/축소 버튼 */}
            <button className="text-gray-400 hover:text-gray-600 btn-secondary">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* 확장된 도구 목록 */}
        {isExpanded && server.tools && (
          <div className="mt-6">
            <h6 className={`font-medium ${server.enabled === false ? 'text-gray-600' : 'text-gray-900'} mb-4`}>{t('server.tools')}</h6>
            <div className="space-y-4">
              {server.tools.map((tool, index) => (
                <ToolCard key={index} server={server.name} tool={tool} onToggle={handleToolToggle} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        serverName={server.name}
      />
    </>
  )
}

export default ServerCard