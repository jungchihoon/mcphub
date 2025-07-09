// React 훅을 가져옵니다
import { useState } from 'react'

// 다국어 지원을 위한 react-i18next 훅을 가져옵니다
import { useTranslation } from 'react-i18next'

// 타입 정의와 아이콘 컴포넌트들을 가져옵니다
import { Group, Server } from '@/types'
import { Edit, Trash, Copy, Check } from '@/components/icons/LucideIcons'

// UI 컴포넌트와 컨텍스트를 가져옵니다
import DeleteDialog from '@/components/ui/DeleteDialog'
import { useToast } from '@/contexts/ToastContext'

/**
 * 그룹 카드 속성 인터페이스
 * 
 * 이 컴포넌트가 받을 수 있는 속성들을 정의합니다.
 */
interface GroupCardProps {
  group: Group;                    // 표시할 그룹 정보
  servers: Server[];               // 전체 서버 목록
  onEdit: (group: Group) => void;  // 편집 버튼 클릭 시 호출될 콜백
  onDelete: (groupId: string) => void; // 삭제 확인 시 호출될 콜백
}

/**
 * 그룹 카드 컴포넌트
 * 
 * 이 컴포넌트는 개별 그룹의 정보를 카드 형태로 표시합니다.
 * 그룹의 이름, 설명, 포함된 서버들, 그리고 편집/삭제 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 그룹 정보 표시 (이름, 설명, ID)
 * - 그룹에 포함된 서버 목록 표시
 * - 서버 상태 표시 (온라인/오프라인/연결 중)
 * - 그룹 ID 복사 기능
 * - 그룹 편집 및 삭제 기능
 * 
 * @param group - 표시할 그룹 정보
 * @param servers - 전체 서버 목록
 * @param onEdit - 편집 콜백
 * @param onDelete - 삭제 콜백
 */
const GroupCard = ({
  group,
  servers,
  onEdit,
  onDelete
}: GroupCardProps) => {
  // 다국어 지원 훅 사용
  const { t } = useTranslation()
  
  // 토스트 알림 훅 사용
  const { showToast } = useToast()
  
  // 컴포넌트 상태 관리
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)  // 삭제 확인 다이얼로그 표시 여부
  const [copied, setCopied] = useState(false)                      // ID 복사 완료 상태

  /**
   * 편집 버튼 클릭 처리 함수
   * 
   * 편집 버튼을 클릭했을 때 호출됩니다.
   */
  const handleEdit = () => {
    onEdit(group)
  }

  /**
   * 삭제 버튼 클릭 처리 함수
   * 
   * 삭제 버튼을 클릭했을 때 호출됩니다.
   * 삭제 확인 다이얼로그를 표시합니다.
   */
  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  /**
   * 삭제 확인 처리 함수
   * 
   * 삭제 확인 다이얼로그에서 확인 버튼을 클릭했을 때 호출됩니다.
   */
  const handleConfirmDelete = () => {
    onDelete(group.id)
    setShowDeleteDialog(false)
  }

  /**
   * 그룹 ID를 클립보드에 복사하는 함수
   * 
   * 최신 브라우저에서는 Clipboard API를 사용하고,
   * 지원하지 않는 경우 fallback으로 document.execCommand를 사용합니다.
   */
  const copyToClipboard = () => {
    if (navigator.clipboard && window.isSecureContext) {
      // 최신 브라우저용 Clipboard API 사용
      navigator.clipboard.writeText(group.id).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)  // 2초 후 복사 완료 상태 해제
      })
    } else {
      // HTTP 환경이나 지원하지 않는 브라우저용 fallback
      const textArea = document.createElement('textarea')
      textArea.value = group.id
      // 스크롤 방지를 위한 스타일 설정
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        showToast(t('common.copyFailed') || 'Copy failed', 'error')
        console.error('Copy to clipboard failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  // 이 그룹에 속한 서버들만 필터링
  const groupServers = servers.filter(server => group.servers.includes(server.name))

  return (
    <div className="bg-white shadow rounded-lg p-6 ">
      {/* 카드 헤더 - 그룹 정보와 액션 버튼들 */}
      <div className="flex justify-between items-center mb-4">
        <div>
          {/* 그룹 이름과 ID */}
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800">{group.name}</h2>
            <div className="flex items-center ml-3">
              <span className="text-xs text-gray-500 mr-1">{group.id}</span>
              {/* ID 복사 버튼 */}
              <button
                onClick={copyToClipboard}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={t('common.copy')}
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          {/* 그룹 설명 (있는 경우에만 표시) */}
          {group.description && (
            <p className="text-gray-600 text-sm mt-1">{group.description}</p>
          )}
        </div>
        
        {/* 액션 버튼들 */}
        <div className="flex items-center space-x-3">
          {/* 서버 수 표시 */}
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm btn-secondary">
            {t('groups.serverCount', { count: group.servers.length })}
          </div>
          {/* 편집 버튼 */}
          <button
            onClick={handleEdit}
            className="text-gray-500 hover:text-gray-700"
            title={t('groups.edit')}
          >
            <Edit size={18} />
          </button>
          {/* 삭제 버튼 */}
          <button
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-600"
            title={t('groups.delete')}
          >
            <Trash size={18} />
          </button>
        </div>
      </div>

      {/* 그룹에 포함된 서버 목록 */}
      <div className="mt-4">
        {groupServers.length === 0 ? (
          // 서버가 없는 경우 메시지 표시
          <p className="text-gray-500 italic">{t('groups.noServers')}</p>
        ) : (
          // 서버 목록을 태그 형태로 표시
          <div className="flex flex-wrap gap-2 mt-2">
            {groupServers.map(server => (
              <div
                key={server.name}
                className="inline-flex items-center px-3 py-1 bg-gray-50 rounded"
              >
                <span className="font-medium text-gray-700 text-sm">{server.name}</span>
                {/* 서버 상태 표시 (색상으로 구분) */}
                <span className={`ml-2 inline-block h-2 w-2 rounded-full ${server.status === 'connected' ? 'bg-green-500' :
                  server.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        serverName={group.name}
        isGroup={true}
      />
    </div>
  )
}

export default GroupCard