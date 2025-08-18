# ========================================
# MCPHub Frontend: React 기반 웹 대시보드
# ========================================
# MCPHub 프론트엔드는 React와 Vite를 사용하는 사용자 인터페이스입니다.
# Backend API 서버와 분리되어 독립적으로 실행되며, 정적 파일로 빌드됩니다.

# 멀티스테이지 빌드를 사용하여 빌드 환경과 실행 환경 분리  
FROM node:22-alpine AS builder

# 작업 디렉토리 설정 (루트 프로젝트)
WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 루트 프로젝트의 의존성 설치 (모든 의존성이 루트에 있음)
COPY package.json pnpm-lock.yaml ./

# 먼저 소스 코드를 복사
COPY . .

# Rollup 네이티브 바이너리 문제 해결: 컨테이너 환경에서 완전히 새로 설치
# node_modules를 삭제하고 Linux 환경에서 다시 설치
RUN rm -rf node_modules && \
    rm -rf frontend/node_modules && \
    pnpm install --frozen-lockfile

# 프론트엔드 빌드 (루트에서 실행)
# pnpm frontend:build = cd frontend && vite build
RUN pnpm frontend:build

# ========================================
# 실행 스테이지: Nginx를 사용한 정적 파일 서빙
# ========================================
FROM nginx:alpine

# 빌드된 파일을 Nginx 웹 루트로 복사
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# 커스텀 Nginx 설정 복사 (SPA 라우팅 지원)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 프론트엔드 포트 노출 (Nginx 기본 포트)
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]