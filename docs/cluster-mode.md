# MCPHub 클러스터 모드 설정 가이드

## 개요

MCPHub 클러스터 모드는 Node.js의 cluster 모듈을 사용하여 여러 워커 프로세스를 실행하는 방식입니다. 이를 통해 CPU 집약적인 작업을 여러 코어에 분산시키고, 하나의 워커가 실패하더라도 다른 워커들이 계속 서비스를 제공할 수 있습니다.

## 아키텍처

```
┌─────────────────┐
│   Load Balancer │ (Kubernetes Service)
│   (nginx/k8s)   │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │   MCPHub  │ (Pod Replica 1)
    │  Master   │
    │ Process   │
    └─────┬─────┘
          │
    ┌─────▼─────┐     ┌─────────────┐     ┌─────────────┐
    │  Worker   │────▶│   Redis     │◀────│   Worker    │
    │ Process 1 │     │  (State)    │     │ Process 2   │
    └───────────┘     └─────────────┘     └─────────────┘
          │                   │                   │
    ┌─────▼─────┐     ┌───────▼───────┐     ┌─────▼─────┐
    │    MCP    │     │  PostgreSQL   │     │    MCP    │
    │  Servers  │     │  (Database)   │     │  Servers  │
    └───────────┘     └───────────────┘     └───────────┘
```

## 주요 특징

### 1. 마스터-워커 구조
- **마스터 프로세스**: 워커 생성/관리, 상태 모니터링, 로드 밸런싱
- **워커 프로세스**: 실제 HTTP 요청 처리, MCP 서버 연결 관리

### 2. Redis 기반 상태 공유
- 워커 간 세션 정보 공유
- MCP 서버 상태 동기화
- 실시간 상태 알림

### 3. 자동 복구
- 워커 프로세스 장애 시 자동 재시작
- 최대 재시작 횟수 제한
- 그레이스풀 셧다운

## 환경변수 설정

### 기본 클러스터 설정

```bash
# 클러스터 모드 활성화
CLUSTER_MODE=true

# 워커 프로세스 수 (0 = CPU 코어 수)
WORKER_PROCESSES=0

# 가비지 컬렉션 최적화
GC_OPTIMIZE=true

# 워커 재시작 설정
WORKER_RESTART_DELAY=5000
WORKER_MAX_RESTARTS=5
```

### Redis 설정 (필수)

```bash
# Redis 활성화
REDIS_ENABLED=true

# Redis 연결 URL
REDIS_URL=redis://redis-service:6379

# Redis 키 프리픽스
REDIS_KEY_PREFIX=mcphub:

# Redis TTL (초)
REDIS_TTL=3600
```

### 보안 설정

```bash
# JWT 비밀키
JWT_SECRET=your-super-secure-jwt-secret

# 세션 비밀키
SESSION_SECRET=your-session-secret
```

## Kubernetes 배포

### 1. 네임스페이스 생성

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. ConfigMap 및 Secret 적용

```bash
# ConfigMap 적용
kubectl apply -f k8s/configmap.yaml

# Secret 적용 (실제 값으로 수정 후)
kubectl apply -f k8s/secret.yaml
```

### 3. Redis 배포

```bash
kubectl apply -f k8s/redis.yaml
```

### 4. MCPHub 배포

```bash
kubectl apply -f k8s/mcphub.yaml
```

### 5. 배포 상태 확인

```bash
# Pod 상태 확인
kubectl get pods -n mcphub

# 서비스 상태 확인
kubectl get services -n mcphub

# 로그 확인
kubectl logs -f deployment/mcphub -n mcphub
```

## 모니터링

### 헬스체크 엔드포인트

```bash
# 기본 헬스체크 (liveness probe)
curl http://mcphub-service/health

# 상세 헬스체크 (readiness probe)
curl http://mcphub-service/health/detailed

# 클러스터 상태 확인
curl http://mcphub-service/health/cluster
```

### 응답 예시

```json
{
  "status": "healthy",
  "timestamp": 1640995200000,
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "processId": 1234,
  "clusterMode": true,
  "checks": {
    "process": {
      "status": "pass",
      "message": "Process is running normally"
    },
    "memory": {
      "status": "pass",
      "message": "Memory usage: 256MB/512MB (50%)"
    },
    "redis": {
      "status": "pass",
      "message": "Redis connection is healthy",
      "duration": 5
    },
    "mcpServers": {
      "status": "pass",
      "message": "MCP servers: 3/3 connected",
      "duration": 12
    }
  }
}
```

## 성능 튜닝

### 1. 워커 프로세스 수 최적화

```bash
# CPU 집약적 작업이 많은 경우
WORKER_PROCESSES=8

# I/O 집약적 작업이 많은 경우
WORKER_PROCESSES=4
```

### 2. 메모리 최적화

```bash
# GC 최적화 활성화
GC_OPTIMIZE=true

# V8 힙 크기 제한
NODE_OPTIONS="--max-old-space-size=512"
```

### 3. Redis 최적화

```bash
# Redis 메모리 정책
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Redis 연결 풀 설정
REDIS_POOL_SIZE=10
```

## 문제 해결

### 1. 워커가 시작되지 않는 경우

```bash
# 로그 확인
kubectl logs -f deployment/mcphub -n mcphub

# 리소스 사용량 확인
kubectl top pods -n mcphub

# 이벤트 확인
kubectl describe pod <pod-name> -n mcphub
```

### 2. Redis 연결 실패

```bash
# Redis 상태 확인
kubectl get pods -l app=redis -n mcphub

# Redis 연결 테스트
kubectl exec -it <redis-pod> -n mcphub -- redis-cli ping

# Redis 로그 확인
kubectl logs -f deployment/redis -n mcphub
```

### 3. 메모리 부족

```bash
# 메모리 사용량 확인
kubectl top pods -n mcphub

# 리소스 제한 조정
kubectl patch deployment mcphub -n mcphub -p '{"spec":{"template":{"spec":{"containers":[{"name":"mcphub","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

## 베스트 프랙티스

### 1. 리소스 관리
- CPU/메모리 requests와 limits 설정
- HPA (Horizontal Pod Autoscaler) 구성
- PDB (Pod Disruption Budget) 설정

### 2. 보안
- 네트워크 정책 설정
- Secret 데이터 암호화
- RBAC 권한 최소화

### 3. 모니터링
- Prometheus 메트릭 수집
- Grafana 대시보드 구성
- 알림 규칙 설정

### 4. 백업
- Redis 데이터 백업
- PostgreSQL 백업
- ConfigMap/Secret 백업

## 참고 자료

- [Node.js Cluster 문서](https://nodejs.org/api/cluster.html)
- [Redis 클러스터 가이드](https://redis.io/topics/cluster-tutorial)
- [Kubernetes 모범 사례](https://kubernetes.io/docs/concepts/configuration/overview/)
- [MCPHub GitHub 리포지토리](https://github.com/samanhappy/mcphub) 