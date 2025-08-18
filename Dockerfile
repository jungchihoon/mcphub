
# MCPHub 백엔드 전용 Dockerfile (MCP 서버 미설치)
FROM node:22 AS base

# 작업 디렉토리 생성
WORKDIR /app

# 의존성 설치 (캐시 최적화)
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 소스 코드 복사
COPY src/ ./src/
COPY tsconfig.json ./
COPY mcp_settings.json ./
COPY servers.json ./
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 환경변수 파일 복사 (옵션)
COPY .env* ./

# 빌드
RUN pnpm backend:build

# 프로덕션 의존성만 남기기
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/index.js"]
# # ==========================================================================
# # ========================================
# # MCPHub Backend: Model Context Protocol 서버 통합 관리 플랫폼 (Backend Only)
# # Azure Container Apps 배포 최적화 버전
# # 참고: https://github.com/samanhappy/mcphub
# # ========================================
# # MCPHub 백엔드는 여러 MCP 서버를 중앙에서 관리하고 API 엔드포인트로 
# # 서비스를 제공하는 서버입니다. Frontend/Backend 분리 아키텍처에서
# # API 서버 및 MCP 프로토콜 처리를 담당합니다.

# # Azure Container Apps는 amd64 플랫폼을 사용하므로 명시적 지정
# FROM python:3.13-slim-bookworm AS base

# # uv (Python 패키지 매니저) 설치
# # uv는 Python 패키지 설치 및 실행을 위한 고성능 도구
# # MCPHub에서 Python 기반 MCP 서버들을 실행하기 위해 필요
# # 예: uvx mcp-server-fetch, uvx mcp-server-sqlite 등
# COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# # 프록시 환경변수 설정 (네트워크 제한 환경 지원)
# # 중국 등 특정 지역에서 패키지 다운로드 최적화를 위한 설정
# # Docker 빌드 시 --build-arg HTTP_PROXY=http://proxy:port 형태로 사용 가능
# ARG HTTP_PROXY=""
# ARG HTTPS_PROXY=""
# ENV HTTP_PROXY=$HTTP_PROXY
# ENV HTTPS_PROXY=$HTTPS_PROXY

# # 시스템 패키지 설치 및 Node.js 설정
# # - curl: 외부 API 호출 및 헬스체크용
# # - gnupg: GPG 키 검증용
# # - git: Git 기반 MCP 서버 설치용
# # - nodejs: MCPHub 메인 애플리케이션 (TypeScript/React) 실행용
# RUN apt-get update && apt-get install -y curl gnupg git \
#   && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
#   && apt-get install -y nodejs \
#   && apt-get clean && rm -rf /var/lib/apt/lists/*

# # pnpm 설치 (Node.js 패키지 매니저)
# # MCPHub는 pnpm을 사용하여 의존성 관리 및 빌드 수행
# RUN npm install -g pnpm

# # MCPHub 런타임 환경변수 설정
# # REQUEST_TIMEOUT: MCP 서버 요청 타임아웃 (기본 60초)
# ARG REQUEST_TIMEOUT=60000
# ENV REQUEST_TIMEOUT=$REQUEST_TIMEOUT

# # BASE_PATH: 리버스 프록시 환경에서 사용할 베이스 경로
# ARG BASE_PATH=""
# ENV BASE_PATH=$BASE_PATH

# # v3.1.0 환경변수 스케줄러 설정 (Azure Container Apps용)
# # Azure Container Apps는 런타임 환경변수 주입이 제한적이므로 빌드 시점에 설정
# ARG ENV_SCHEDULER_ENABLED=true
# ENV ENV_SCHEDULER_ENABLED=$ENV_SCHEDULER_ENABLED

# ARG ENV_SCHEDULER_INTERVAL_HOURS=24
# ENV ENV_SCHEDULER_INTERVAL_HOURS=$ENV_SCHEDULER_INTERVAL_HOURS

# ARG ENV_SCHEDULER_AUTO_CLEANUP=true
# ENV ENV_SCHEDULER_AUTO_CLEANUP=$ENV_SCHEDULER_AUTO_CLEANUP

# ARG ENV_SCHEDULER_MAX_ORPHANED_KEYS=10
# ENV ENV_SCHEDULER_MAX_ORPHANED_KEYS=$ENV_SCHEDULER_MAX_ORPHANED_KEYS

# # 스케줄러 특정 시간 실행 설정 (00:00 기본값)
# ARG ENV_SCHEDULER_SCHEDULED_TIME="00:00"
# ENV ENV_SCHEDULER_SCHEDULED_TIME=$ENV_SCHEDULER_SCHEDULED_TIME

# # 전역 MCP 서버 패키지 설치
# # 현재 mcp_settings.json에서 실제 사용하는 패키지만 설치
# ENV PNPM_HOME=/usr/local/share/pnpm
# ENV PATH=$PNPM_HOME:$PATH
# RUN mkdir -p $PNPM_HOME && \
#   # Context7 MCP 서버만 설치 (현재 활성화된 유일한 stdio 서버)
#   # - @upstash/context7-mcp: Context7 문서화 MCP 서버
#   # 다른 서버들(mcp-atlassian, github-pr-mcp-server)은 외부 HTTP 서버이므로 설치 불필요
#   pnpm add -g @upstash/context7-mcp

# # Playwright 브라우저 설치 (선택적)
# # 웹 자동화 및 스크래핑이 필요한 MCP 서버들을 위한 Chrome 브라우저 설치
# # Azure Container Apps는 amd64 플랫폼이므로 Chrome 설치 가능
# # Docker 빌드 시 --build-arg INSTALL_PLAYWRIGHT=true 로 활성화 가능
# ARG INSTALL_PLAYWRIGHT=false
# RUN if [ "$INSTALL_PLAYWRIGHT" = "true" ]; then \
#   echo "Installing Playwright Chrome for Azure Container Apps (amd64)..."; \
#   npx -y playwright install --with-deps chrome; \
#   fi

# # Python 기반 MCP 서버 설치
# # 현재 mcp_settings.json에서 Python 기반 MCP 서버를 사용하지 않으므로 생략
# # 필요시 uv tool install <package-name> 형태로 추가 가능

# # 애플리케이션 작업 디렉토리 설정
# WORKDIR /app

# # Backend 의존성 설치 (캐시 최적화)
# # package.json과 pnpm-lock.yaml을 먼저 복사하여 Docker 레이어 캐싱 활용
# # TypeScript 빌드를 위해 devDependencies도 포함하여 설치
# COPY package.json pnpm-lock.yaml ./
# RUN pnpm install --frozen-lockfile

# # Backend 소스 코드 복사
# # 프론트엔드는 제외하고 백엔드 소스만 복사 (Frontend/Backend 분리)
# COPY src/ ./src/
# COPY tsconfig.json ./

# # 설정 파일들 복사 (이미지 빌드 시점의 설정 사용)
# COPY mcp_settings.json ./
# COPY servers.json ./

# # 환경변수 파일 복사
# ARG BUILD_ENV=development
# COPY .env* ./
# RUN if [ "$BUILD_ENV" = "production" ]; then \
#       cp .env.production .env; \
#     elif [ "$BUILD_ENV" = "docker" ]; then \
#       cp .env.docker .env; \
#     else \
#       cp .env.development .env; \
#     fi

# # 최신 MCP 서버 목록 다운로드
# RUN curl -s -f --connect-timeout 10 https://mcpm.sh/api/servers.json -o servers.json || echo "Failed to download servers.json, using bundled version"

# # 백엔드 빌드
# # TypeScript 백엔드 서버 빌드 (Frontend는 별도 컨테이너에서 빌드)
# RUN pnpm backend:build

# # 프로덕션 의존성만 남기고 devDependencies 제거 (이미지 크기 최적화)
# RUN pnpm install --prod --frozen-lockfile

# # Azure Container Apps용 엔트리포인트 스크립트 설정
# # 컨테이너 시작 시 실행될 스크립트 (환경 설정, 초기화 등)
# COPY entrypoint.sh /usr/local/bin/entrypoint.sh
# RUN chmod +x /usr/local/bin/entrypoint.sh

# # MCPHub 백엔드 API 서버 포트 노출
# # 3000번 포트로 API 엔드포인트 및 MCP 프로토콜 서비스 제공
# EXPOSE 3000

# # 컨테이너 헬스체크 설정
# # /health 엔드포인트를 통해 MCPHub 서비스 상태 모니터링
# # 30초마다 체크, 10초 타임아웃, 5초 시작 지연, 3회 재시도
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:3000/health || exit 1

# # 컨테이너 실행 설정
# # entrypoint.sh를 통해 환경 초기화 후 MCPHub 백엔드 서버 시작
# ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# CMD ["node", "dist/index.js"]
