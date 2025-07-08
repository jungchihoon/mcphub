# ========================================
# MCPHub: Model Context Protocol 서버 통합 관리 플랫폼
# 참고: https://github.com/samanhappy/mcphub
# ========================================
# MCPHub는 여러 MCP 서버를 중앙에서 관리하고 Streamable HTTP 엔드포인트로 
# 조직화하는 통합 허브입니다. 다양한 AI 클라이언트(Claude Desktop, Cursor 등)가
# 단일 엔드포인트를 통해 모든 MCP 서버에 접근할 수 있게 해줍니다.

# Python 베이스 이미지를 사용하는 이유:
# 1. uvx를 통한 Python 기반 MCP 서버들 (mcp-server-fetch 등) 실행
# 2. Python 생태계의 다양한 MCP 서버 지원
FROM python:3.13-slim-bookworm AS base

# uv (Python 패키지 매니저) 설치
# uv는 Python 패키지 설치 및 실행을 위한 고성능 도구
# MCPHub에서 Python 기반 MCP 서버들을 실행하기 위해 필요
# 예: uvx mcp-server-fetch, uvx mcp-server-sqlite 등
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 프록시 환경변수 설정 (네트워크 제한 환경 지원)
# 중국 등 특정 지역에서 패키지 다운로드 최적화를 위한 설정
# Docker 빌드 시 --build-arg HTTP_PROXY=http://proxy:port 형태로 사용 가능
ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY

# 시스템 패키지 설치 및 Node.js 설정
# - curl: 외부 API 호출 및 헬스체크용
# - gnupg: GPG 키 검증용
# - git: Git 기반 MCP 서버 설치용
# - nodejs: MCPHub 메인 애플리케이션 (TypeScript/React) 실행용
RUN apt-get update && apt-get install -y curl gnupg git \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# pnpm 설치 (Node.js 패키지 매니저)
# MCPHub는 pnpm을 사용하여 의존성 관리 및 빌드 수행
RUN npm install -g pnpm

# MCPHub 런타임 환경변수 설정
# REQUEST_TIMEOUT: MCP 서버 요청 타임아웃 (기본 60초)
ARG REQUEST_TIMEOUT=60000
ENV REQUEST_TIMEOUT=$REQUEST_TIMEOUT

# BASE_PATH: 리버스 프록시 환경에서 사용할 베이스 경로
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH

# 전역 MCP 서버 패키지 설치
# MCPHub는 다양한 MCP 서버를 지원하며, 자주 사용되는 서버들을 미리 설치
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p $PNPM_HOME && \
  # 기존 패키지들 (주석 처리)
  # pnpm add -g @amap/amap-maps-mcp-server @playwright/mcp@latest tavily-mcp@latest @modelcontextprotocol/server-github @modelcontextprotocol/server-slack
  # 현재 mcp_settings.json에 맞는 패키지들 설치:
  # - @amap/amap-maps-mcp-server: 지도 및 위치 기반 서비스
  # - @modelcontextprotocol/server-github: GitHub API 연동
  # - @modelcontextprotocol/server-slack: Slack 통합
  # - @smithery/cli: Smithery MCP 서버 실행 도구
  # - firecrawl-mcp: 웹 크롤링 및 스크래핑 서비스
  pnpm add -g @amap/amap-maps-mcp-server @modelcontextprotocol/server-github @modelcontextprotocol/server-slack @smithery/cli@latest firecrawl-mcp

# 기존 INSTALL_EXT 블록 (주석 처리)
# ARG INSTALL_EXT=false
# RUN if [ "$INSTALL_EXT" = "true" ]; then \
#   ARCH=$(uname -m); \
#   if [ "$ARCH" = "x86_64" ]; then \
#   npx -y playwright install --with-deps chrome; \
#   else \
#   echo "Skipping Chrome installation on non-amd64 architecture: $ARCH"; \
#   fi; \
#   fi

# Playwright 브라우저 설치 (선택적)
# 웹 자동화 및 스크래핑이 필요한 MCP 서버들을 위한 Chrome 브라우저 설치
# amd64 플랫폼에서만 설치되며, ARM 등 다른 아키텍처에서는 스킵
# Docker 빌드 시 --build-arg INSTALL_PLAYWRIGHT=true 로 활성화 가능
ARG INSTALL_PLAYWRIGHT=false
RUN if [ "$INSTALL_PLAYWRIGHT" = "true" ]; then \
  ARCH=$(uname -m); \
  if [ "$ARCH" = "x86_64" ]; then \
  echo "Installing Playwright Chrome for amd64 platform..."; \
  npx -y playwright install --with-deps chrome; \
  else \
  echo "Skipping Chrome installation on non-amd64 architecture: $ARCH"; \
  fi; \
  fi

# Python 기반 MCP 서버 설치
# mcp-server-fetch: HTTP 요청 및 웹 리소스 접근을 위한 MCP 서버
# MCPHub의 기본 제공 서버 중 하나로 웹 API 호출 기능 제공
RUN uv tool install mcp-server-fetch

# 애플리케이션 작업 디렉토리 설정
WORKDIR /app

# Node.js 의존성 설치 (캐시 최적화)
# package.json과 pnpm-lock.yaml을 먼저 복사하여 Docker 레이어 캐싱 활용
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# 소스 코드 복사
# 의존성 설치 후 소스 코드를 복사하여 코드 변경 시에만 재빌드되도록 최적화
COPY . .

# 최신 MCP 서버 목록 다운로드
# mcpm.sh에서 제공하는 최신 MCP 서버 목록을 다운로드
# 실패 시 번들된 기본 servers.json 파일 사용
# 이를 통해 MCPHub 마켓플레이스에서 최신 MCP 서버들을 확인할 수 있음
RUN curl -s -f --connect-timeout 10 https://mcpm.sh/api/servers.json -o servers.json || echo "Failed to download servers.json, using bundled version"

# 프론트엔드 및 백엔드 빌드
# - frontend:build: React 기반 웹 대시보드 빌드
# - build: TypeScript 백엔드 서버 빌드
RUN pnpm frontend:build && pnpm build

# 엔트리포인트 스크립트 설정
# 컨테이너 시작 시 실행될 스크립트 (환경 설정, 초기화 등)
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# MCPHub 웹 서버 포트 노출
# 3000번 포트로 웹 대시보드 및 MCP 엔드포인트 서비스 제공
EXPOSE 3000

# 컨테이너 헬스체크 설정 (클러스터 모드 대응)
# /health 엔드포인트를 통해 MCPHub 서비스 상태 모니터링
# 클러스터 모드에서는 초기화 시간이 더 오래 걸릴 수 있으므로 시작 지연 시간 증가
# 30초마다 체크, 10초 타임아웃, 90초 시작 지연, 3회 재시도
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 컨테이너 실행 설정
# entrypoint.sh를 통해 환경 초기화 후 MCPHub 서버 시작
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["pnpm", "start"]
