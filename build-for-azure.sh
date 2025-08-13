#!/bin/bash
# ========================================
# Azure Container Apps 배포용 Docker 이미지 빌드 및 Docker Hub 푸시 스크립트
# ========================================

set -e

echo "🚀 Azure Container Apps 배포용 Docker 이미지 빌드 및 푸시 시작..."

# Docker Hub 설정
DOCKER_HUB_USERNAME="giglepeople"
VERSION="v1"

# 이미지 태그 설정
BACKEND_IMAGE="mcphub-backend:azure"
FRONTEND_IMAGE="mcphub-frontend:azure"

# Docker Hub 태그 설정
BACKEND_HUB_TAG="$DOCKER_HUB_USERNAME/mcphub-backend:$VERSION"
FRONTEND_HUB_TAG="$DOCKER_HUB_USERNAME/mcphub-frontend:$VERSION"

# 1. Backend 이미지 빌드
echo "📦 Backend 이미지 빌드 중..."
docker build \
  --platform linux/amd64 \
  --build-arg BUILD_ENV=production \
  --build-arg INSTALL_PLAYWRIGHT=false \
  --build-arg REQUEST_TIMEOUT=300000 \
  --build-arg BASE_PATH="" \
  -t $BACKEND_IMAGE \
  -t $BACKEND_HUB_TAG \
  -f Dockerfile .

echo "✅ Backend 이미지 빌드 완료: $BACKEND_IMAGE"

# 2. Frontend 이미지 빌드
echo "📦 Frontend 이미지 빌드 중..."
docker build \
  --platform linux/amd64 \
  -t $FRONTEND_IMAGE \
  -t $FRONTEND_HUB_TAG \
  -f frontend/Dockerfile .

echo "✅ Frontend 이미지 빌드 완료: $FRONTEND_IMAGE"

# 3. Docker Hub 로그인 확인
echo "🔐 Docker Hub 로그인 상태 확인 중..."
if ! docker info | grep -q "Username"; then
  echo "⚠️  Docker Hub에 로그인되지 않았습니다."
  echo "   다음 명령어로 로그인해주세요:"
  echo "   docker login -u giglepeople"
  echo ""
  read -p "Docker Hub에 로그인하시겠습니까? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker login -u giglepeople
  else
    echo "❌ Docker Hub 로그인이 필요합니다. 스크립트를 중단합니다."
    exit 1
  fi
fi

# 4. Docker Hub 푸시
echo "🚀 Docker Hub에 이미지 푸시 중..."
echo "📤 Backend 이미지 푸시: $BACKEND_HUB_TAG"
docker push $BACKEND_HUB_TAG

echo "📤 Frontend 이미지 푸시: $FRONTEND_HUB_TAG"
docker push $FRONTEND_HUB_TAG

echo "✅ Docker Hub 푸시 완료!"

# 5. 이미지 정보 출력
echo ""
echo "🎉 빌드 완료!"
echo ""
echo "📋 이미지 정보:"
echo "  Backend (로컬): $BACKEND_IMAGE"
echo "  Frontend (로컬): $FRONTEND_IMAGE"
echo "  Backend (Docker Hub): $BACKEND_HUB_TAG"
echo "  Frontend (Docker Hub): $FRONTEND_HUB_TAG"
echo ""
echo "📏 이미지 크기:"
docker images $BACKEND_IMAGE $FRONTEND_IMAGE $BACKEND_HUB_TAG $FRONTEND_HUB_TAG --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo ""
echo "🔧 Azure Container Apps 배포 방법:"
echo "  1. Azure Portal → Container Apps 접속"
echo "  2. 새 Container App 생성"
echo "  3. 이미지 소스: 'Container Registry' 선택"
echo "  4. 이미지: $BACKEND_HUB_TAG 또는 $FRONTEND_HUB_TAG"
echo "  5. 포트: Backend(3000), Frontend(80)"
echo "  6. 환경변수 설정 (필요시)"
echo ""
echo "💡 환경변수 설정 (Backend용):"
echo "  DATABASE_URL=postgresql://ktadmin:New1234!@postgres-az01-sbox-poc-131.postgres.database.azure.com:5432/mcphub"
echo "  NODE_ENV=production"
echo "  REQUEST_TIMEOUT=300000"
echo "  SMART_ROUTING_ENABLED=true"
echo ""
echo "🔐 시크릿 설정 (Backend용):"
echo "  JWT_SECRET=your-production-jwt-secret"
echo "  GITHUB_CLIENT_ID=your-github-client-id"
echo "  GITHUB_CLIENT_SECRET=your-github-client-secret"
echo "  OPENAI_API_KEY=your-openai-api-key"
echo ""
echo "🌐 Docker Hub 이미지 URL:"
echo "  Backend: https://hub.docker.com/r/giglepeople/mcphub-backend"
echo "  Frontend: https://hub.docker.com/r/giglepeople/mcphub-frontend" 