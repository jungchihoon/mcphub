# MCPHub v3.0.2 🚀

<div align="center">

**MCP 프로토콜 표준 준수 + AI 혁신 기능 + 문서화 100% 완성**

[![Version](https://img.shields.io/badge/version-v3.0.2-blue.svg)](https://github.com/jungchihoon/mcphub/releases/tag/v3.0.2)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D14.0.0-blue.svg)](https://postgresql.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP_Protocol-2025--06--18-brightgreen.svg)](https://modelcontextprotocol.io/)
[![Documentation](https://img.shields.io/badge/documentation-100%25_complete-brightgreen.svg)](https://github.com/jungchihoon/mcphub/tree/main/docs)

[빠른 시작](#-빠른-시작) • [v3.0 새 기능](#-v30-새로운-기능) • [문서](#-문서-가이드) • [기능](#-핵심-기능) • [API](#-api-문서) • [브랜치 히스토리](BRANCH_HISTORY.md) • [기여하기](#-기여하기)

</div>

---

## 🌟 MCPHub란?

**MCPHub**는 Model Context Protocol (MCP) 서버들을 중앙 집중식으로 관리하는 혁신적인 허브 플랫폼입니다. 

### 🎯 핵심 혁신 (v3.0.0)
- **🔥 Cursor IDE 완벽 호환**: MCP 프로토콜 2025-06-18 표준 준수
- **⚡ 다중 사용자 세션 격리**: 사용자별 요청/토큰/상태 완전 분리
- **🔒 개인 그룹 관리**: 사용자별 MCP 서버 그룹 생성 및 도구 선택적 노출
- **🚀 엔터프라이즈 준비**: 프로덕션 환경에서 즉시 사용 가능

---

## ✨ v3.0 새로운 기능

### 🔒 **다중 사용자 세션 격리 시스템**
- **사용자별 요청 추적**: 고유 ID로 모든 요청 추적 및 관리
- **업스트림 컨텍스트 전파**: 사용자 정보를 업스트림 MCP 서버에 헤더로 전달
- **토큰 격리**: 사용자별 API 토큰이 정확한 업스트림에만 전달
- **세션 보안**: 세션 종료 시 관련 리소스 자동 정리

### ⚡ **요청 추적 및 모니터링**
- **실시간 요청 추적**: 사용자별/세션별 진행 중인 요청 모니터링
- **성능 통계**: 응답 시간, 에러율 등 사용자별 통계 수집
- **타임아웃 관리**: 30초 타임아웃으로 무한 대기 방지
- **디버깅 향상**: 상세한 로그로 요청 플로우 추적

### 🛡️ **보안 강화**
- **권한 격리**: 사용자별 API 토큰이 올바른 업스트림에만 전달
- **상태 분리**: 사용자별 컨텍스트가 완전히 독립적으로 관리
- **감사 추적**: 모든 요청이 고유 ID로 추적되어 보안 감사 가능
- **세션 정리**: 비정상 종료 시에도 리소스 자동 정리

### 🎯 **업스트림 헤더 시스템**
```typescript
// 업스트림 MCP 서버가 받는 헤더
{
  'X-MCPHub-User-Id': 'user-uuid',
  'X-MCPHub-User-Session-Id': 'user-session',
  'X-MCPHub-Request-Id': 'request-uuid', 
  'X-MCPHub-GitHub-Token': 'user-token',
  'X-MCPHub-Protocol-Version': '2025-06-18'
}
```

---

## 🚀 빠른 시작

### 📦 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/jungchihoon/mcphub.git
cd mcphub

# 의존성 설치
pnpm install

# 환경 설정
cp .env.example .env
# .env 파일에서 필요한 환경변수 설정

# 프론트엔드 + 백엔드 동시 실행 (권장)
pnpm run dev

# 또는 개별 실행
pnpm backend:dev    # 백엔드만 (포트 3000)
pnpm frontend:dev   # 프론트엔드만 (포트 5173)
```

### 🔧 환경변수 관리 (v3.1 신규 - 자동화 시스템)

#### 🤖 자동 관리 시스템
```bash
# 개발 환경에서 스케줄러 활성화
ENV_SCHEDULER_ENABLED=true pnpm start:dev

# 자동 정리 활성화 (신중하게 사용)
ENV_AUTO_CLEANUP=true pnpm start:dev
```

#### 📱 웹 UI 관리 도구
- **관리자 페이지**: `http://localhost:3000/admin/env-vars`
- **실시간 모니터링**: 서버 수, 환경변수 수, 고아 키 수
- **스케줄러 제어**: 활성화/비활성화, 주기 설정
- **원클릭 작업**: 즉시 검증, 정리 시뮬레이션, 실제 정리

#### 🛠️ CLI 도구
```bash
# 환경변수 매핑 검증
npm run env:validate

# 사용 현황 보고서
npm run env:report
npm run env:report:detailed  # 사용자별 상세 정보

# 고아 키 정리 (시뮬레이션)
npm run env:cleanup:dry-run

# 고아 키 정리 (실제 실행)
npm run env:cleanup
```

#### 🔌 API 엔드포인트
```bash
# 스케줄러 상태 조회
curl http://localhost:3000/api/admin/env-scheduler/status

# 수동 검증 실행
curl -X POST http://localhost:3000/api/admin/env-scheduler/run

# 환경변수 정리 (시뮬레이션)
curl -X POST http://localhost:3000/api/env-vars/cleanup \
  -d '{"dryRun": true}'
```

#### 📊 보고서 예시
```
📊 MCPHub 환경변수 사용 현황 보고서
========================================
📊 전체 요약
   - 총 MCP 서버: 4개
   - 총 환경변수: 7개  
   - 총 사용자: 3명
   - 고아 키: 1개 ⚠️

🖥️ 서버별 환경변수 사용률
   github-pr-mcp-server: 66.7% (2/3명)
   mcp-atlassian-jira: 33.3% (1/3명)
   context7: 0.0% (0/3명)

🤖 자동 관리 상태
   - 스케줄러: 활성화 ✅
   - 다음 실행: 12시간 후
   - 자동 정리: 비활성화 (안전모드)

💡 권장사항
   - USER_GITHUB_TOKEN 키가 사용되지 않습니다
   - npm run env:cleanup:dry-run으로 정리 시뮬레이션 가능
```

### 🎮 즉시 체험하기

1. **http://localhost:5173** 접속 (프론트엔드)
2. **GitHub OAuth로 로그인**
3. **설정 페이지**에서 API 키 입력
4. **그룹 관리**에서 원하는 MCP 서버 선택
5. **Cursor IDE**에서 새로운 설정으로 연결

---

## 📚 문서 가이드

### 🎯 **시작하기 (필수 읽기)**

| 문서 | 설명 | 중요도 |
|------|------|-------|
| 🎉 **[v2.6.0 릴리즈 노트](docs/release-notes/v2.6.0-session-isolation-2025-08-01.md)** | 최신 릴리즈 상세 정보 | ⭐⭐⭐ |
| 🚀 **[Cursor IDE 통합 가이드](docs/cursor-ide-integration.md)** | Cursor에서 "No tools or prompts" 해결 포함 최종 가이드 | ⭐⭐⭐ |
| 📊 **[프로젝트 현황](docs/mcphub-project-status.md)** | 전체 프로젝트 상태 및 완성도 | ⭐⭐⭐ |
| ⚡ **[환경변수 시스템](docs/mcphub-env-var-system.md)** | 핵심 자동화 시스템 가이드 | ⭐⭐⭐ |

### 🔧 **개발자 문서**

| 문서 | 설명 | 대상 |
|------|------|------|
| 🔄 **[MCP 세션 관리](docs/mcp-session-management.md)** | MCP 프로토콜 세션 처리 메커니즘 | 백엔드 개발자 |
| 🧪 **[세션 격리 테스트 가이드](docs/session-isolation-test-guide.md)** | 다중 사용자 세션 격리 테스트 방법 | ⭐ **신규** |
| 🔐 **[MCPHub Key + 세션 격리 통합](docs/mcphub-key-session-integration-flow.md)** | OAuth → Key 발급 → Cursor 연결 전체 플로우 | ⭐ **신규** |
| ⚠️ **[MCP 서버 격리 현실 점검](docs/mcp-server-user-isolation-reality-check.md)** | 기존 MCP 서버의 한계와 실제 보안 위험 | ⭐ **신규** |
| 🗄️ **[데이터베이스 스키마](docs/database-schema.md)** | 완전한 DB 구조 및 관계 | 백엔드 개발자 |
| 📡 **[API 참조](docs/api-reference.md)** | 모든 API 엔드포인트 명세 | 풀스택 개발자 |
| 🛣️ **[라우팅 참조](docs/routing-reference.md)** | 프론트엔드 라우팅 구조 | 프론트엔드 개발자 |
| 🔗 **[업스트림 세션 스토어](docs/upstream-session-store.md)** | Redis 기반 Mcp-Session-Id 재사용 가이드 | 백엔드 개발자 |

### 🚀 **설정 및 배포**

| 문서 | 설명 | 대상 |
|------|------|------|
| 🔐 **[OAuth 설정](docs/oauth-setup-guide.md)** | GitHub OAuth 설정 가이드 | 시스템 관리자 |
| 🏗️ **[설치 가이드](docs/installation.mdx)** | 상세한 설치 및 배포 가이드 | 운영팀 |
| ⚙️ **[환경 설정](docs/configuration/)** | 각종 설정 파일 관리 | 운영팀 |

### 📝 릴리즈 노트

- 최신: `docs/release-notes/v3.1.1-cursor-compatibility-2025-08-08.md` – Cursor 초기협상 완전 호환

### 🧪 **테스트 및 품질관리**

| 문서 | 설명 | 대상 |
|------|------|------|
| 🔬 **[테스트 프레임워크](docs/testing-framework.md)** | 테스트 구조 및 실행 방법 | QA/개발자 |
| 📋 **[OpenAPI 지원](docs/openapi-support.md)** | OpenAPI 스키마 지원 현황 | API 개발자 |

### 📖 **사용자 가이드**

| 문서 | 설명 | 대상 |
|------|------|------|
| ⚡ **[빠른 시작](docs/quickstart.mdx)** | 5분만에 MCPHub 시작하기 | 모든 사용자 |
| 🎯 **[기능 가이드](docs/features/)** | 각 기능별 상세 사용법 | 일반 사용자 |

---

## 🎯 핵심 기능

### ✅ **완성된 기능들 (v1.0.0)**

#### 🔥 **환경변수 자동화 시스템**
```
mcp_settings.json 서버 추가
    ↓ 자동 감지
extractUserEnvVars() 환경변수 탐지
    ↓ 자동 생성  
/api/env-templates API 템플릿 제공
    ↓ 자동 렌더링
프론트엔드 UI 필드 생성
    ↓ 자동 저장
mcphub_keys.serviceTokens DB 저장
```

#### 🔐 **GitHub OAuth 통합 인증**
- 원클릭 GitHub 로그인
- JWT 토큰 기반 세션 관리
- 자동 사용자 정보 동기화
- 관리자/일반 사용자 권한 분리

#### 👥 **관리자 UI 시스템**
- 📊 **관리자 대시보드**: 시스템 현황 모니터링
- 👥 **사용자 관리**: 사용자 목록 및 권한 관리  
- 🔧 **MCP 서버 관리**: `mcp_settings.json` 직접 편집
- 📈 **키 상태 모니터링**: 사용자별 API 키 현황

#### 🗄️ **데이터베이스 시스템**
- PostgreSQL + pgvector 확장
- TypeORM 자동 스키마 관리
- 암호화된 API 키 저장
- 벡터 검색 지원

#### 🛡️ **보안 로깅 시스템**
- 프로덕션용 로깅 시스템
- 민감한 정보 자동 마스킹
- 토큰 정보 로그 제거
- 디버그 로그 환경별 제어

#### 🔧 **완전한 디버그 로깅**
- End-to-End 요청 플로우 추적
- 서비스별 전문 로깅 (@sseService, @mcpService)
- 네트워크 통신 상세 분석 (헤더, 바디, 성능)
- 자동화된 테스트 및 분석 도구

---

## 🏗 시스템 아키텍처

### **백엔드 구조**
```
src/
├── controllers/     # API 컨트롤러 (12개)
├── routes/         # API 라우팅
├── services/       # 비즈니스 로직
├── middlewares/    # 인증/권한 미들웨어  
├── utils/          # 환경변수 감지 등 유틸리티
├── db/            # 데이터베이스 엔티티/리포지토리
└── config/        # 설정 관리
```

### **프론트엔드 구조**
```
frontend/src/
├── pages/         # 페이지 컴포넌트 (일반/관리자)
├── components/    # 재사용 컴포넌트
├── contexts/      # React Context (인증, 테마, 토스트)
├── hooks/         # 커스텀 훅
├── services/      # API 통신
└── utils/         # 유틸리티 함수 (로깅 등)
```

---

## 📡 API 문서

### **핵심 API 엔드포인트**

#### 🔐 **인증**
- `GET /api/oauth/github` - GitHub OAuth 로그인
- `GET /api/oauth/callback` - OAuth 콜백 처리
- `GET /api/user/me` - 현재 사용자 정보

#### ⚙️ **환경변수 관리**
- `GET /api/env-templates` - 서버별 환경변수 템플릿 조회
- `GET /api/user-env-vars` - 사용자 환경변수 조회
- `POST /api/user-env-vars` - 사용자 환경변수 저장

#### 🔧 **서버 관리**
- `GET /api/servers` - MCP 서버 목록 조회
- `GET /api/admin/settings-file` - mcp_settings.json 조회
- `PUT /api/admin/settings-file` - mcp_settings.json 수정

**📋 [전체 API 명세서 보기](docs/api-reference.md)**

---

## 🔧 개발 환경

### **기술 스택**
- **백엔드**: Node.js, TypeScript, Express, TypeORM
- **프론트엔드**: React, TypeScript, Vite, Tailwind CSS  
- **데이터베이스**: PostgreSQL + pgvector
- **인증**: GitHub OAuth, JWT
- **배포**: Docker, Docker Compose

### **개발 도구**
- **코드 품질**: ESLint, Prettier
- **테스트**: Jest
- **번들링**: Vite (프론트엔드), tsc (백엔드)
- **패키지 관리**: pnpm

### **프로젝트 관리**
- **Git 워크플로우**: Feature Branch 전략
- **브랜치 관리**: `main` (stable) → `feature/*` (development)
- **릴리즈 관리**: Semantic Versioning (v1.0.0)

---

## 📊 성능 및 확장성

### **무한 확장 가능성**
- ✅ **서버 수량 제한 없음**: 새 MCP 서버 무제한 추가
- ✅ **환경변수 수량 제한 없음**: 서버당 환경변수 무제한  
- ✅ **코드 수정 불필요**: 관리자 UI에서 모든 관리
- ✅ **실시간 적용**: 변경사항 즉시 반영

### **성능 최적화**
- **벡터 검색**: IVFFlat 인덱스로 도구 검색 최적화
- **API 최적화**: 필요한 데이터만 조회/전송
- **프론트엔드**: React 최적화 기법 적용
- **데이터베이스**: 적절한 인덱스 설정

---

## 🔮 로드맵

### **v2.0 계획 (진행 중)**
- **브랜치**: `feature/real-mcp-servers-v2`
- **목표**: 실제 MCP 서버 연결

#### **v2.0 주요 기능**
1. **실제 MCP 서버 통합**
   - GitHub MCP 서버 완전 연결
   - Firecrawl 웹 스크래핑 서비스
   - Jira 이슈 관리 시스템

2. **성능 최적화**
   - 실시간 모니터링 시스템
   - 연결 상태 자동 복구
   - 로드 밸런싱 구현

3. **사용자 경험 향상**
   - 실시간 알림 시스템
   - 고급 대시보드
   - 사용 통계 및 분석

---

## 🤝 기여하기

### **기여 방법**

1. **이슈 확인**: [GitHub Issues](https://github.com/jungchihoon/mcphub/issues)
2. **브랜치 생성**: `git checkout -b feature/새기능명`
3. **개발 및 테스트**: 코드 작성 및 테스트
4. **커밋**: Conventional Commits 규칙 준수
5. **PR 생성**: [PR 템플릿](.github/pull_request_template.md) 사용

### **커밋 메시지 규칙**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스 변경

---

## 📞 지원 및 커뮤니티

### **GitHub**
- **메인 저장소**: [jungchihoon/mcphub](https://github.com/jungchihoon/mcphub)
- **이슈 트래커**: [GitHub Issues](https://github.com/jungchihoon/mcphub/issues)
- **릴리즈**: [GitHub Releases](https://github.com/jungchihoon/mcphub/releases)

### **문서 & 개발**
- **전체 문서**: [docs/](docs/)
- **API 참조**: [docs/references/api-reference.md](docs/references/api-reference.md)
- **설치 가이드**: [docs/installation.mdx](docs/installation.mdx)
- **브랜치 히스토리**: [BRANCH_HISTORY.md](BRANCH_HISTORY.md) 🆕

---

## 📄 라이선스

이 프로젝트는 [MIT License](LICENSE) 하에 배포됩니다.

---

## 📈 프로젝트 통계

- **📁 총 파일**: 100개+
- **📝 코드 라인**: 15,000줄+
- **📚 문서**: 10개+
- **🎯 완성도**: 프로덕션 준비 완료

---

<div align="center">

**MCPHub v1.0.0 - 완전 자동화된 MCP 서버 환경변수 관리 시스템**

⭐ **이 프로젝트가 도움이 되었다면 Star를 눌러주세요!** ⭐

**최종 업데이트**: 2025년 7월 30일  
**현재 버전**: v1.0.0  
**다음 목표**: v2.0 - 실제 MCP 서버 연결

</div>
