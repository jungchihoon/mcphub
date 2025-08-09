# MCPHub API 명세서

## 📋 개요

MCPHub는 Model Context Protocol 서버들을 중앙에서 관리하고 사용자별 API 키를 동적으로 주입하는 허브 서버입니다.

**기본 URL**: `http://localhost:3000/api`

## 🔐 인증

대부분의 API는 JWT 토큰 인증이 필요합니다. 헤더에 다음을 포함하세요:

```
Authorization: Bearer <JWT_TOKEN>
x-auth-token: <JWT_TOKEN>
```

## 📚 API 카테고리

### 1. 인증 (Authentication)
### 2. 사용자 관리 (User Management)
### 3. MCP 서버 관리 (MCP Server Management)
### 4. API 키 관리 (API Key Management)
### 5. 관리자 기능 (Admin Functions)
### 6. 시스템 모니터링 (System Monitoring)
### 7. 설정 관리 (Configuration Management)

---

## 1. 인증 (Authentication)

### 1.1 로그인
**파일**: `src/routes/index.ts` (라인 48-102)

```http
POST /api/auth/login
```

**요청 본문**:
```json
{
  "username": "string",
  "password": "string"
}
```

**응답**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "JWT_TOKEN",
  "user": {
    "username": "string",
    "isAdmin": boolean
  }
}
```

### 1.2 현재 사용자 정보 조회
**파일**: `src/routes/index.ts` (라인 104-135)

```http
GET /api/auth/me
```

**헤더**:
```
x-auth-token: <JWT_TOKEN>
```

**응답**:
```json
{
  "success": true,
  "data": {
    "username": "string",
    "isAdmin": boolean
  }
}
```

### 1.3 GitHub OAuth 로그인
**파일**: `src/controllers/oauthController.ts` (라인 1-50)

```http
GET /api/auth/github
```

**응답**: GitHub OAuth 페이지로 리다이렉트

### 1.4 GitHub OAuth 콜백
**파일**: `src/controllers/oauthController.ts` (라인 52-120)

```http
GET /api/auth/github/callback
```

**쿼리 파라미터**:
- `code`: GitHub OAuth 코드
- `state`: OAuth 상태 토큰

**응답**: 메인 페이지로 리다이렉트 (토큰 포함)

---

## 2. 사용자 관리 (User Management)

### 2.1 사용자 목록 조회 (관리자)
**파일**: `src/routes/index.ts` (라인 350-400)

```http
GET /api/admin/users
```

**권한**: 관리자만

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "githubUsername": "string",
      "email": "string",
      "displayName": "string",
      "isAdmin": boolean,
      "isActive": boolean,
      "lastLoginAt": "ISO_DATE",
      "createdAt": "ISO_DATE"
    }
  ]
}
```

---

## 3. MCP 서버 관리 (MCP Server Management)

### 3.1 서버 목록 조회
**파일**: `src/controllers/serverController.ts` (라인 1-50)

```http
GET /api/servers
```

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "name": "string",
      "type": "stdio|streamable-http|sse",
      "enabled": boolean,
      "group": "string",
      "description": "string"
    }
  ]
}
```

### 3.2 서버 생성
**파일**: `src/controllers/serverController.ts` (라인 52-100)

```http
POST /api/servers
```

**요청 본문**:
```json
{
  "name": "string",
  "type": "stdio|streamable-http|sse",
  "command": "string",
  "args": ["string"],
  "url": "string",
  "headers": {},
  "enabled": boolean,
  "group": "string",
  "description": "string"
}
```

### 3.3 서버 수정
**파일**: `src/controllers/serverController.ts` (라인 102-150)

```http
PUT /api/servers/:name
```

**요청 본문**: 서버 생성과 동일

### 3.4 서버 삭제
**파일**: `src/controllers/serverController.ts` (라인 152-180)

```http
DELETE /api/servers/:name
```

### 3.5 서버 활성화/비활성화
**파일**: `src/controllers/serverController.ts` (라인 182-220)

```http
POST /api/servers/:name/toggle
```

### 3.6 도구 활성화/비활성화
**파일**: `src/controllers/serverController.ts` (라인 222-260)

```http
POST /api/servers/:serverName/tools/:toolName/toggle
```

### 3.7 도구 설명 수정
**파일**: `src/controllers/serverController.ts` (라인 262-300)

```http
PUT /api/servers/:serverName/tools/:toolName/description
```

**요청 본문**:
```json
{
  "description": "string"
}
```

---

## 4. API 키 관리 (API Key Management)

### 4.1 OAuth 키 목록 조회
**파일**: `src/controllers/oauthController.ts` (라인 122-180)

```http
GET /api/oauth/keys
```

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "isActive": boolean,
      "expiresAt": "ISO_DATE",
      "lastUsedAt": "ISO_DATE",
      "usageCount": number,
      "createdAt": "ISO_DATE"
    }
  ]
}
```

### 4.2 OAuth 키 생성
**파일**: `src/controllers/oauthController.ts` (라인 182-240)

```http
POST /api/oauth/keys
```

**요청 본문**:
```json
{
  "name": "string",
  "description": "string",
  "expiresInDays": number
}
```

### 4.3 OAuth 키 상세 정보 조회
**파일**: `src/controllers/oauthController.ts` (라인 242-300)

```http
GET /api/oauth/keys/:keyId
```

### 4.4 OAuth 키 전체 값 조회
**파일**: `src/controllers/oauthController.ts` (라인 302-360)

```http
GET /api/oauth/keys/:keyId/full-value
```

### 4.5 OAuth 키 토큰 조회
**파일**: `src/controllers/oauthController.ts` (라인 362-420)

```http
GET /api/oauth/keys/:keyId/tokens
```

### 4.6 OAuth 키 토큰 업데이트
**파일**: `src/controllers/oauthController.ts` (라인 422-480)

```http
PUT /api/oauth/keys/:keyId/tokens
```

**요청 본문**:
```json
{
  "tokens": {
    "GITHUB_TOKEN": "string",
    "FIRECRAWL_TOKEN": "string"
  }
}
```

### 4.7 OAuth 키 만료일 연장
**파일**: `src/controllers/oauthController.ts` (라인 482-540)

```http
POST /api/oauth/keys/:keyId/extend
```

**요청 본문**:
```json
{
  "days": number
}
```

### 4.8 OAuth 키 삭제
**파일**: `src/controllers/oauthController.ts` (라인 542-600)

```http
DELETE /api/oauth/keys/:keyId
```

### 4.9 MCP 서버 API 키 조회
**파일**: `src/controllers/mcpServerController.ts` (라인 200-250)

```http
GET /api/mcp/servers/:serverName/api-keys
```

### 4.10 MCP 서버 API 키 설정
**파일**: `src/controllers/mcpServerController.ts` (라인 252-300)

```http
POST /api/mcp/servers/:serverName/api-keys
```

**요청 본문**:
```json
{
  "varName": "string",
  "value": "string"
}
```

### 4.11 MCP 서버 API 키 삭제
**파일**: `src/controllers/mcpServerController.ts` (라인 302-350)

```http
DELETE /api/mcp/servers/:serverName/api-keys
```

**쿼리 파라미터**:
- `varName`: 환경변수명

---

## 5. 관리자 기능 (Admin Functions)

### 5.1 시스템 통계 조회
**파일**: `src/routes/index.ts` (라인 220-280)

```http
GET /api/admin/stats
```

**권한**: 관리자만

**응답**:
```json
{
  "success": true,
  "data": {
    "totalUsers": number,
    "activeUsers": number,
    "totalServers": number,
    "activeServers": number,
    "totalKeys": number,
    "activeKeys": number,
    "todayLogs": number,
    "systemStatus": "healthy|warning|error"
  }
}
```

### 5.2 사용자 키 상태 조회
**파일**: `src/routes/index.ts` (라인 282-350)

```http
GET /api/admin/user-keys
```

**권한**: 관리자만

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "string",
      "githubUsername": "string",
      "displayName": "string",
      "isActive": boolean,
      "hasKey": boolean,
      "keyInfo": {
        "id": "uuid",
        "name": "string",
        "isActive": boolean,
        "expiresAt": "ISO_DATE",
        "lastUsedAt": "ISO_DATE",
        "usageCount": number,
        "createdAt": "ISO_DATE",
        "daysUntilExpiry": number
      }
    }
  ]
}
```

### 5.3 관리자 활동 로그 조회
**파일**: `src/routes/index.ts` (라인 352-360)

```http
GET /api/admin/activities
```

**권한**: 관리자만

**응답**:
```json
{
  "success": true,
  "data": []
}
```

### 5.4 MCP 서버 관리 (관리자)
**파일**: `src/routes/mcpServerRoutes.ts` (라인 15-22)

#### 5.4.1 MCP 서버 목록 조회
```http
GET /api/mcp/admin/servers
```

#### 5.4.2 활성화된 MCP 서버 목록 조회
```http
GET /api/mcp/admin/servers/enabled
```

#### 5.4.3 MCP 서버 상세 조회
```http
GET /api/mcp/admin/servers/:name
```

#### 5.4.4 MCP 서버 생성
```http
POST /api/mcp/admin/servers
```

#### 5.4.5 MCP 서버 수정
```http
PUT /api/mcp/admin/servers/:name
```

#### 5.4.6 MCP 서버 삭제
```http
DELETE /api/mcp/admin/servers/:name
```

#### 5.4.7 MCP 서버 활성화/비활성화
```http
PATCH /api/mcp/admin/servers/:name/toggle
```

### 5.5 환경변수 스케줄러 관리 (v3.1 신규)

#### 5.5.1 스케줄러 상태 조회
**파일**: `src/routes/index.ts` (라인 675-702)

```http
GET /api/admin/env-scheduler/status
```

**권한**: 관리자만

**응답**:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "config": {
      "enabled": true,
      "intervalHours": 24,
      "autoCleanup": false,
      "maxOrphanedKeys": 10,
      "scheduledTime": "00:00"
    },
    "nextRunTime": "2025-08-07T15:00:00.000Z"
  }
}
```

#### 5.5.2 스케줄러 설정 업데이트
**파일**: `src/routes/index.ts` (라인 705-738)

```http
POST /api/admin/env-scheduler/config
```

**권한**: 관리자만

**요청 본문**:
```json
{
  "enabled": true,
  "intervalHours": 12,
  "autoCleanup": false,
  "maxOrphanedKeys": 5,
  "scheduledTime": "00:00"
}
```

**파라미터 상세**:
- `enabled` (boolean): 스케줄러 활성화 여부
- `intervalHours` (number): 주기적 실행 간격 (시간 단위, 1-168)
- `autoCleanup` (boolean): 자동 정리 활성화 여부 (기본: false)
- `maxOrphanedKeys` (number): 알림 임계값 (고아 키 개수, 1-100)
- `scheduledTime` (string, 선택사항): 특정 시간 실행 ("HH:MM" 형식)

**실행 방식**:
1. **특정 시간 실행**: `scheduledTime`이 설정된 경우 매일 해당 시간에 실행
2. **주기적 실행**: `scheduledTime`이 null인 경우 `intervalHours` 간격으로 실행

**응답**:
```json
{
  "success": true,
  "message": "스케줄러 설정이 업데이트되었습니다.",
  "data": {
    "enabled": true,
    "intervalHours": 12,
    "autoCleanup": false,
    "maxOrphanedKeys": 5,
    "scheduledTime": "00:00"
  }
}
```

#### 5.5.3 스케줄러 수동 실행
**파일**: `src/routes/index.ts` (라인 741-765)

```http
POST /api/admin/env-scheduler/run
```

**권한**: 관리자만

**응답**:
```json
{
  "success": true,
  "message": "환경변수 검증이 수동으로 실행되었습니다."
}
```

**설명**: 스케줄러 설정과 상관없이 즉시 환경변수 검증 작업을 실행합니다.

### 5.6 환경변수 관리

#### 5.6.1 환경변수 검증
**파일**: `src/routes/index.ts` (라인 624-640)

```http
GET /api/env-vars/validate
```

**권한**: 인증 필요

**응답**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "issues": [
      {
        "type": "ORPHANED_KEY",
        "severity": "WARNING",
        "message": "USER_GITHUB_TOKEN이 사용되지 않습니다"
      }
    ],
    "summary": {
      "totalServers": 4,
      "totalEnvVars": 7,
      "totalUsers": 3,
      "usersWithTokens": 2,
      "orphanedKeys": ["USER_GITHUB_TOKEN"],
      "missingKeys": []
    }
  }
}
```

#### 5.6.2 환경변수 정리
**파일**: `src/routes/index.ts` (라인 643-672)

```http
POST /api/env-vars/cleanup
```

**권한**: 인증 필요

**요청 본문**:
```json
{
  "dryRun": true
}
```

**파라미터**:
- `dryRun` (boolean): true면 시뮬레이션만, false면 실제 정리 실행

**응답**:
```json
{
  "success": true,
  "message": "환경변수 분석 완료: 1명의 사용자, 1개 변수 처리",
  "data": {
    "affectedUsers": 1,
    "removedVars": ["USER_GITHUB_TOKEN"],
    "dryRun": true
  }
}
```

#### 5.6.3 환경변수 사용 현황 보고서
**파일**: `src/routes/index.ts` (라인 768-812)

```http
GET /api/env-vars/report
```

**권한**: 인증 필요

**응답**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalServers": 4,
      "totalEnvVars": 7,
      "totalUsers": 3,
      "usersWithTokens": 2
    },
    "issues": [],
    "timestamp": "2025-08-07T06:00:00.000Z"
  }
}
```

---

## 6. 시스템 모니터링 (System Monitoring)

### 6.1 헬스 체크
**파일**: `src/routes/index.ts` (라인 200-210)

```http
GET /api/health
```

**응답**:
```json
{
  "success": true,
  "message": "MCPHub API is running",
  "timestamp": "ISO_DATE",
  "version": "string",
  "uptime": number
}
```

### 6.2 런타임 설정 조회
**파일**: `src/routes/index.ts` (라인 212-225)

```http
GET /api/config/runtime
```

**응답**:
```json
{
  "success": true,
  "data": {
    "basePath": "string",
    "version": "string",
    "name": "mcphub"
  }
}
```

### 6.3 로그 스트림 (SSE)
**파일**: `src/routes/index.ts` (라인 405-435)

```http
GET /api/logs/stream
```

**응답**: Server-Sent Events 스트림

**이벤트 형식**:
```json
{
  "type": "initial|log",
  "logs": [
    {
      "timestamp": number,
      "type": "info|warning|error",
      "source": "string",
      "message": "string"
    }
  ]
}
```

---

## 7. 마켓플레이스 (Marketplace)

### 7.1 마켓 서버 목록 조회
**파일**: `src/controllers/marketController.ts` (라인 1-50)

```http
GET /api/market
```

### 7.2 마켓 카테고리 목록 조회
**파일**: `src/controllers/marketController.ts` (라인 52-80)

```http
GET /api/market/categories
```

### 7.3 마켓 태그 목록 조회
**파일**: `src/controllers/marketController.ts` (라인 82-110)

```http
GET /api/market/tags
```

### 7.4 마켓 서버 검색
**파일**: `src/controllers/marketController.ts` (라인 112-140)

```http
GET /api/market/search
```

**쿼리 파라미터**:
- `q`: 검색어

### 7.5 카테고리별 마켓 서버 조회
**파일**: `src/controllers/marketController.ts` (라인 142-170)

```http
GET /api/market/category/:category
```

### 7.6 태그별 마켓 서버 조회
**파일**: `src/controllers/marketController.ts` (라인 172-200)

```http
GET /api/market/tag/:tag
```

### 7.7 마켓 서버 상세 조회
**파일**: `src/controllers/marketController.ts` (라인 202-225)

```http
GET /api/market/:name
```

---

## 8. 사용자 그룹 관리 (User Group Management)

### 8.1 사용자 그룹 목록 조회
**파일**: `src/controllers/userGroupController.ts`

```http
GET /api/user/groups
```

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "servers": ["string"],
      "isActive": boolean,
      "createdAt": "ISO_DATE",
      "updatedAt": "ISO_DATE"
    }
  ]
}
```

### 8.2 사용자 그룹 생성
**파일**: `src/controllers/userGroupController.ts`

```http
POST /api/user/groups
```

**요청 본문**:
```json
{
  "name": "string",
  "description": "string",
  "servers": ["string"]
}
```

### 8.3 사용자 그룹 수정
**파일**: `src/controllers/userGroupController.ts`

```http
PUT /api/user/groups/:groupId
```

**요청 본문**:
```json
{
  "name": "string",
  "description": "string",
  "servers": ["string"]
}
```

### 8.4 사용자 그룹 삭제
**파일**: `src/controllers/userGroupController.ts`

```http
DELETE /api/user/groups/:groupId
```

### 8.5 사용자 그룹 활성화/비활성화
**파일**: `src/controllers/userGroupController.ts`

```http
PATCH /api/user/groups/:groupId/active
```

**요청 본문**:
```json
{
  "isActive": boolean
}
```

---

## 9. 도구 관리 (Tool Management)

### 9.1 도구 목록 조회
**파일**: `src/controllers/toolController.ts` (라인 1-50)

```http
GET /api/tools
```

### 9.2 도구 실행
**파일**: `src/controllers/toolController.ts` (라인 52-124)

```http
POST /api/tools/:toolName
```

**요청 본문**:
```json
{
  "arguments": {}
}
```

---

## 10. 키 관리 (Key Management)

### 10.1 키 목록 조회
**파일**: `src/routes/index.ts` (라인 180-190)

```http
GET /api/keys
```

### 10.2 키 생성
**파일**: `src/routes/index.ts` (라인 192-205)

```http
POST /api/keys
```

**요청 본문**:
```json
{
  "name": "string"
}
```

### 10.3 키 삭제
**파일**: `src/routes/index.ts` (라인 207-215)

```http
DELETE /api/keys/:id
```

---

## 📊 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": {},
  "message": "string"
}
```

### 오류 응답
```json
{
  "success": false,
  "message": "string",
  "error": "string"
}
```

---

## 🔒 권한 레벨

1. **공개**: 인증 불필요
   - `GET /api/health`
   - `GET /api/config/runtime`

2. **인증 필요**: 로그인한 사용자
   - 대부분의 API

3. **관리자 전용**: 관리자 권한 필요
   - `GET /api/admin/*`
   - `POST /api/mcp/admin/*`
   - `PUT /api/mcp/admin/*`
   - `DELETE /api/mcp/admin/*`

---

## 📝 에러 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| 400 | Bad Request | 잘못된 요청 형식 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 권한 부족 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 500 | Internal Server Error | 서버 내부 오류 |

---

## 7. 설정 관리 (Configuration Management)

### 7.1 런타임 설정 조회
**파일**: `src/controllers/configController.ts` (라인 27-50)

```http
GET /config
```

**인증**: 불필요

**응답**:
```json
{
  "success": true,
  "data": {
    "basePath": "",
    "version": "3.0.0",
    "name": "mcphub"
  }
}
```

**설명**: 프론트엔드에서 필요한 기본 런타임 설정 정보를 반환합니다.

### 7.2 로그인 페이지 설정 조회
**파일**: `src/controllers/configController.ts` (라인 62-84)

```http
GET /login/config
```

**인증**: 불필요

**응답**:
```json
{
  "success": true,
  "data": {}
}
```

**설명**: 로그인 페이지에서 필요한 공개 설정 정보를 반환합니다. 현재는 빈 객체를 반환하며, 향후 공개 설정이 추가될 수 있습니다.

---

## 🔄 API 버전 관리

현재 API 버전: `v1`

버전 변경 시 URL에 버전을 포함할 예정:
```
/api/v1/endpoint
```

---

## 📚 관련 문서

- [데이터베이스 스키마](./database-schema.md)
- [설치 가이드](./installation.md)
- [개발 가이드](./development.md) 