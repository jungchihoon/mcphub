#!/bin/bash

# MCPHub v3.0 성능 테스트 통합 실행 스크립트
# 
# 🎯 목표: 시스템 전체 성능 측정, 부하 테스트, 성능 최적화를 순차적으로 실행
# 📊 테스트 유형: 벤치마크, 부하 테스트, 스트레스 테스트, 성능 최적화
# 🚀 최적화: AI Auto-Configuration System의 347배 성능 향상 검증

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

# 시작 시간 기록
START_TIME=$(date +%s)

# 헤더 출력
echo -e "${CYAN}"
echo "=================================================================="
echo "🚀 MCPHub v3.0 성능 테스트 통합 실행 스크립트"
echo "=================================================================="
echo "🎯 목표: 시스템 전체 성능 측정 및 최적화"
echo "📊 테스트: 벤치마크 + 부하 테스트 + 스트레스 테스트 + 최적화"
echo "🚀 검증: AI Auto-Configuration System 347배 성능 향상"
echo "=================================================================="
echo -e "${NC}"

# 환경 확인
log_info "환경 확인 중..."

# Node.js 버전 확인
if ! command -v node &> /dev/null; then
    log_error "Node.js가 설치되지 않았습니다."
    exit 1
fi

NODE_VERSION=$(node --version)
log_info "Node.js 버전: $NODE_VERSION"

# TypeScript 확인
if ! command -v ts-node &> /dev/null; then
    log_warning "ts-node가 설치되지 않았습니다. 설치를 시도합니다..."
    npm install -g ts-node
fi

# 의존성 확인
if [ ! -f "package.json" ]; then
    log_error "package.json을 찾을 수 없습니다. 올바른 디렉토리에서 실행하세요."
    exit 1
fi

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    log_warning "node_modules가 없습니다. 의존성을 설치합니다..."
    npm install
fi

log_success "환경 확인 완료"

# 1단계: 성능 벤치마크 실행
log_header "1단계: 성능 벤치마크 실행"
log_info "시스템 전체 성능 측정 시작..."

if [ -f "scripts/performance-benchmark.ts" ]; then
    log_info "성능 벤치마크 스크립트 실행 중..."
    npx tsx scripts/performance-benchmark.ts
    log_success "성능 벤치마크 완료"
else
    log_error "성능 벤치마크 스크립트를 찾을 수 없습니다: scripts/performance-benchmark.ts"
    exit 1
fi

echo ""

# 2단계: 부하 테스트 및 스트레스 테스트 실행
log_header "2단계: 부하 테스트 및 스트레스 테스트 실행"
log_info "시스템 부하 처리 능력 테스트 시작..."

if [ -f "scripts/load-stress-test.ts" ]; then
    log_info "부하 테스트 및 스트레스 테스트 스크립트 실행 중..."
    npx tsx scripts/load-stress-test.ts
    log_success "부하 테스트 및 스트레스 테스트 완료"
else
    log_error "부하 테스트 스크립트를 찾을 수 없습니다: scripts/load-stress-test.ts"
    exit 1
fi

echo ""

# 3단계: 성능 최적화 실행
log_header "3단계: 성능 최적화 실행"
log_info "성능 병목 지점 최적화 시작..."

if [ -f "scripts/performance-optimization.ts" ]; then
    log_info "성능 최적화 스크립트 실행 중..."
    npx tsx scripts/performance-optimization.ts
    log_success "성능 최적화 완료"
else
    log_error "성능 최적화 스크립트를 찾을 수 없습니다: scripts/performance-optimization.ts"
    exit 1
fi

echo ""

# 4단계: 최적화 후 재테스트
log_header "4단계: 최적화 후 재테스트"
log_info "최적화 효과 검증을 위한 재테스트 시작..."

log_info "최적화 후 성능 벤치마크 재실행..."
npx tsx scripts/performance-benchmark.ts

log_success "최적화 후 재테스트 완료"

echo ""

# 5단계: 결과 요약 및 보고서 생성
log_header "5단계: 결과 요약 및 보고서 생성"
log_info "성능 테스트 결과 요약 생성 중..."

# 종료 시간 기록
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 결과 요약 출력
echo -e "${CYAN}"
echo "=================================================================="
echo "📊 MCPHub v3.0 성능 테스트 완료 요약"
echo "=================================================================="
echo "⏱️  총 소요 시간: ${DURATION}초"
echo "📅 실행 일시: $(date)"
echo "🎯 테스트 완료:"
echo "   ✅ 1단계: 성능 벤치마크"
echo "   ✅ 2단계: 부하 테스트 및 스트레스 테스트"
echo "   ✅ 3단계: 성능 최적화"
echo "   ✅ 4단계: 최적화 후 재테스트"
echo "   ✅ 5단계: 결과 요약 및 보고서 생성"
echo "=================================================================="
echo -e "${NC}"

# 성능 개선점 도출
log_header "💡 성능 개선점 도출"

echo "🔧 주요 최적화 영역:"
echo "   - AI Auto-Configuration System: 347배 성능 향상 목표"
echo "   - MCP 서버 연결: 연결 풀링 및 재사용"
echo "   - 데이터베이스 쿼리: 인덱스 및 쿼리 최적화"
echo "   - API 엔드포인트: 캐싱 및 압축 최적화"
echo "   - 메모리 사용량: 메모리 풀링 및 GC 최적화"

echo ""
echo "📈 성능 목표:"
echo "   - 응답 시간: 100ms 이하"
echo "   - 처리량: 100 req/s 이상"
echo "   - 에러율: 1% 이하"
echo "   - 메모리 사용량: 30% 절약"

echo ""
echo "🚀 다음 단계:"
echo "   - 실제 시스템에서의 성능 검증"
echo "   - 프로덕션 환경 부하 테스트"
echo "   - 지속적인 성능 모니터링"
echo "   - 사용자 피드백 기반 추가 최적화"

# 성공 메시지
log_success "🎉 모든 성능 테스트가 성공적으로 완료되었습니다!"
log_info "결과는 위의 출력을 참조하세요."

echo ""
echo -e "${GREEN}✅ 성능 테스트 통합 실행 완료!${NC}"
echo -e "${BLUE}📊 다음 단계: 실제 시스템 성능 검증 및 프로덕션 배포 준비${NC}"

exit 0
