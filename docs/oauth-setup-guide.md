# 🔐 GitHub OAuth + MCPHub Key 시스템 설정 가이드

MCPHub는 Smithery와 유사한 간편한 인증 시스템을 제공합니다. 사용자는 GitHub로 로그인하고 단일 MCPHub Key를 통해 Cursor IDE에서 모든 MCP 서버를 이용할 수 있습니다.

## 🎯 **시스템 작동 원리**

```mermaid
sequenceDiagram
    participant User as 사용자
    participant MCPHub as MCPHub 웹
    participant GitHub as GitHub OAuth
    participant DB as PostgreSQL
    participant Cursor as Cursor IDE

    User->>MCPHub: "GitHub로 로그인" 클릭
    MCPHub->>GitHub: OAuth 인증 요청
    GitHub->>User: 로그인 화면
    User->>GitHub: GitHub 계정 로그인
    GitHub->>MCPHub: 사용자 정보 반환
    MCPHub->>DB: GitHub 사용자 정보 저장/업데이트
    MCPHub->>DB: MCPHub Key 생성 (90일 만료)
    MCPHub->>User: "mcphub_xxxxx" 키 제공
    User->>Cursor: mcp.json에 MCPHub Key 설정
    Cursor->>MCPHub: MCPHub Key로 모든 MCP 서버 이용
```

## 📋 **설정 단계**

### 1. **GitHub OAuth App 생성**

1. GitHub → Settings → Developer settings → OAuth Apps로 이동
2. "New OAuth App" 클릭
3. 정보 입력:
   - **Application name**: MCPHub
   - **Homepage URL**: `http://localhost:3000` (또는 도메인)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. Client ID와 Client Secret 저장

### 2. **환경변수 설정**

`.env` 파일에 다음 설정을 추가하세요:

```env
# GitHub OAuth 설정
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# 세션 보안 키 (운영환경에서는 안전한 랜덤 문자열 사용)
SESSION_SECRET=your-secure-session-secret-change-in-production

# 데이터베이스
DATABASE_URL=postgresql://localhost:5432/mcphub

# JWT 설정
JWT_SECRET=your-jwt-secret-key-change-this-in-production
```

### 3. **데이터베이스 설정**

PostgreSQL 데이터베이스를 준비하세요:

```bash
# PostgreSQL 설치 (macOS)
brew install postgresql
brew services start postgresql

# 데이터베이스 생성
createdb mcphub

# 또는 Docker 사용
docker run --name mcphub-postgres -e POSTGRES_DB=mcphub -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

## 🎮 **사용자 경험**

### **1단계: GitHub 로그인**
- MCPHub 웹페이지에서 "GitHub로 로그인" 버튼 클릭
- GitHub 인증 완료

### **2단계: MCPHub Key 확인**
- 로그인 후 "MCPHub Keys" 페이지에서 자동 생성된 키 확인
- 키 형식: `mcphub_a1b2c3d4e5f6...` (64자리)

### **3단계: Cursor IDE 설정**
`mcp.json` 파일에 한 줄만 추가:

```json
{
  "mcpServers": {
    "mcphub": {
      "command": "streamable-http",
      "args": ["http://localhost:3000/mcp"],
      "headers": {
        "Authorization": "Bearer mcphub_your_key_here",
        "Connection": "keep-alive"
      },
      "options": {
        "timeout": 300000,
        "keepAlive": true,
        "keepAliveMsecs": 30000
      }
    }
  }
}
```

### **4단계: 모든 MCP 서버 이용**
- GitHub MCP 서버
- Firecrawl 웹 스크래핑
- OpenAI 도구들
- 기타 연결된 모든 서비스

## 🔑 **MCPHub Key 관리 기능**

### **핵심 특징**
- ✅ **90일 자동 만료** (연장 가능)
- ✅ **서비스 토큰 저장** (GitHub, Firecrawl 등)
- ✅ **사용량 추적** 및 통계
- ✅ **사용자당 다중 키** 지원
- ✅ **즉시 취소** 기능

### **키 생성**
```bash
# 웹 UI에서 새 키 생성
POST /api/oauth/keys
{
  "name": "Cursor IDE Key",
  "description": "내 개발 환경용 키"
}
```

### **키 만료 연장**
```bash
# 90일 연장
POST /api/oauth/keys/{keyId}/extend
```

### **서비스 토큰 추가**
```bash
# GitHub, Firecrawl 등의 토큰 연결
PUT /api/oauth/keys/{keyId}/tokens
{
  "GITHUB_TOKEN": "ghp_xxxxx",
  "FIRECRAWL_TOKEN": "fc_xxxxx"
}
```

## 🛡️ **보안 특징**

### **인증 계층**
1. **GitHub OAuth**: 안전한 외부 인증
2. **MCPHub Key**: 90일 만료 API 키
3. **세션 관리**: Express 세션 + Passport.js
4. **토큰 암호화**: 서비스 토큰 안전 저장

### **권한 제어**
- 키별 개별 권한 관리
- 사용자별 키 소유권 확인
- 관리자 권한 분리
- 실시간 키 비활성화

## 📊 **모니터링 및 통계**

### **키 사용량 추적**
- 총 사용 횟수
- 마지막 사용 시간
- 연결된 서비스 목록
- 만료일까지 남은 시간

### **시스템 통계**
- 전체 사용자 수
- 활성 키 개수
- 만료 예정 키 알림
- 서비스별 사용량

## 🚀 **이점**

### **개발자 편의성**
- **🎯 단순함**: 하나의 키로 모든 MCP 서버 접근
- **🔄 관리 용이성**: 웹 UI에서 키 생성/관리/삭제
- **📈 가시성**: 실시간 사용량 및 상태 모니터링

### **보안 강화**
- **🔐 OAuth 인증**: GitHub 계정 기반 안전한 로그인
- **⏰ 시간 제한**: 90일 자동 만료로 보안 위험 최소화
- **🔒 토큰 격리**: 각 키별 독립적인 서비스 토큰 관리

### **확장성**
- **📦 모듈식**: 새로운 MCP 서버 쉽게 추가
- **🏢 다중 사용자**: 사용자별 독립적인 키 관리
- **⚡ 성능**: DB 기반 효율적인 인증 및 권한 처리

## 🛠️ **문제 해결**

### **일반적인 문제**

#### 1. GitHub OAuth 실패
```bash
# 환경변수 확인
echo $GITHUB_CLIENT_ID
echo $GITHUB_CLIENT_SECRET

# 콜백 URL 확인
# http://localhost:3000/api/auth/github/callback
```

#### 2. 데이터베이스 연결 실패
```bash
# PostgreSQL 상태 확인
brew services list | grep postgresql

# 데이터베이스 연결 테스트
psql postgresql://localhost:5432/mcphub
```

#### 3. 키 인증 실패
```bash
# 키 형식 확인 (mcphub_ prefix 필수)
# 만료일 확인
# 활성 상태 확인
```

### **로그 확인**
```bash
# MCPHub 서버 로그
tail -f logs/mcphub.log

# 인증 관련 로그
grep "OAuth\|Key" logs/mcphub.log
```

## 🔄 **업그레이드 가이드**

### **기존 JSON 사용자 → DB 마이그레이션**
```bash
# 기존 사용자 데이터 백업
cp mcp_settings.json mcp_settings.json.backup

# 마이그레이션 실행
npm run migrate:users

# 새 OAuth 시스템 활성화
npm restart
```

이제 MCPHub의 GitHub OAuth + Key 시스템이 완전히 설정되었습니다! 사용자는 GitHub 계정으로 쉽게 로그인하고, 안전한 MCPHub Key로 모든 MCP 서버를 편리하게 이용할 수 있습니다. 🎉 