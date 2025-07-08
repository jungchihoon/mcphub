// React 훅들을 가져옵니다
import { useState, useEffect } from 'react'

// 다국어 지원을 위한 react-i18next 훅을 가져옵니다
import { useTranslation } from 'react-i18next'

// 데이터 관리 훅들을 가져옵니다
import { useGroupData } from '@/hooks/useGroupData'
import { useServerData } from '@/hooks/useServerData'

// 타입 정의와 UI 컴포넌트를 가져옵니다
import { GroupFormData, Server } from '@/types'
import { ToggleGroup } from './ui/ToggleGroup'

/**
 * 그룹 추가 폼 속성 인터페이스
 * 
 * 이 컴포넌트가 받을 수 있는 콜백 함수들을 정의합니다.
 */
interface AddGroupFormProps {
  onAdd: () => void;    // 그룹 추가 성공 시 호출될 콜백
  onCancel: () => void; // 취소 버튼 클릭 시 호출될 콜백
}

/**
 * 그룹 추가 폼 컴포넌트
 * 
 * 이 컴포넌트는 새로운 그룹을 생성하기 위한 모달 폼을 제공합니다.
 * 사용자가 그룹 이름, 설명을 입력하고 포함할 서버들을 선택할 수 있습니다.
 * 
 * 주요 기능:
 * - 그룹 이름 및 설명 입력
 * - 활성화된 서버들 중에서 선택
 * - 폼 유효성 검사
 * - 그룹 생성 처리
 * 
 * @param onAdd - 그룹 추가 성공 시 호출될 콜백
 * @param onCancel - 취소 시 호출될 콜백
 */
const AddGroupForm = ({ onAdd, onCancel }: AddGroupFormProps) => {
  // 다국어 지원 훅 사용
  const { t } = useTranslation()
  
  // 그룹 데이터 관리 훅에서 그룹 생성 함수 가져오기
  const { createGroup } = useGroupData()
  
  // 서버 데이터 관리 훅에서 서버 목록 가져오기
  const { servers } = useServerData()
  
  // 컴포넌트 상태 관리
  const [availableServers, setAvailableServers] = useState<Server[]>([])  // 선택 가능한 서버 목록
  const [error, setError] = useState<string | null>(null)                 // 오류 메시지
  const [isSubmitting, setIsSubmitting] = useState(false)                 // 제출 중 상태

  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',        // 그룹 이름
    description: '', // 그룹 설명
    servers: []      // 선택된 서버 목록
  })

  /**
   * 서버 목록이 변경될 때 선택 가능한 서버들을 필터링
   * 
   * 활성화된 서버들만 선택 가능하도록 필터링합니다.
   */
  useEffect(() => {
    // 활성화된 서버들만 필터링 (enabled가 false가 아닌 서버들)
    setAvailableServers(servers.filter(server => server.enabled !== false))
  }, [servers])

  /**
   * 폼 입력 필드 변경 처리 함수
   * 
   * 사용자가 입력 필드의 값을 변경할 때 호출됩니다.
   * 
   * @param e - 입력 이벤트
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  /**
   * 폼 제출 처리 함수
   * 
   * 사용자가 폼을 제출할 때 호출됩니다.
   * 유효성 검사 후 그룹을 생성합니다.
   * 
   * @param e - 폼 제출 이벤트
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()  // 기본 폼 제출 동작 방지
    setIsSubmitting(true)  // 제출 중 상태로 설정
    setError(null)  // 이전 오류 메시지 초기화

    try {
      // 그룹 이름 유효성 검사
      if (!formData.name.trim()) {
        setError(t('groups.nameRequired'))
        setIsSubmitting(false)
        return
      }

      // 그룹 생성 시도
      const result = await createGroup(formData.name, formData.description, formData.servers)

      if (!result) {
        // 그룹 생성 실패 시 오류 메시지 표시
        setError(t('groups.createError'))
        setIsSubmitting(false)
        return
      }

      // 그룹 생성 성공 시 콜백 호출
      onAdd()
    } catch (err) {
      // 예외 발생 시 오류 메시지 표시
      setError(err instanceof Error ? err.message : String(err))
      setIsSubmitting(false)
    }
  }

  return (
    // 모달 오버레이 - 배경을 어둡게 하고 중앙 정렬
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      {/* 모달 카드 */}
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          {/* 모달 제목 */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('groups.addNew')}</h2>

          {/* 오류 메시지 표시 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* 그룹 추가 폼 */}
          <form onSubmit={handleSubmit}>
            {/* 그룹 이름 입력 필드 */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                {t('groups.name')} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline form-input"
                placeholder={t('groups.namePlaceholder')}
                required
              />
            </div>

            {/* 서버 선택 토글 그룹 */}
            <ToggleGroup
              className="mb-6"
              label={t('groups.servers')}
              noOptionsText={t('groups.noServerOptions')}
              values={formData.servers}
              options={availableServers.map(server => ({
                value: server.name,
                label: server.name
              }))}
              onChange={(servers) => setFormData(prev => ({ ...prev, servers }))}
            />

            {/* 버튼 그룹 */}
            <div className="flex justify-end space-x-3">
              {/* 취소 버튼 */}
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 btn-secondary"
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              {/* 생성 버튼 */}
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 btn-primary"
                disabled={isSubmitting}
              >
                {/* 제출 중일 때와 일반 상태일 때 다른 텍스트 표시 */}
                {isSubmitting ? t('common.submitting') : t('common.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddGroupForm