# 🔌 MCPHub v3.0 혁신 기능 API 참조

> 🎯 **핵심 목표**: MCPHub v3.0의 4개 혁신 기능에 대한 완전한 API 문서

## 📋 목차

1. [개요](#개요)
2. [통합 혁신 플랫폼 API](#통합-혁신-플랫폼-api)
3. [AI 자동 구성 시스템 API](#ai-자동-구성-시스템-api)
4. [분산 위험 관리 시스템 API](#분산-위험-관리-시스템-api)
5. [실시간 성능 예측 API](#실시간-성능-예측-api)
6. [에러 코드 및 응답](#에러-코드-및-응답)
7. [인증 및 권한](#인증-및-권한)

---

## 🌟 개요

MCPHub v3.0은 **4개의 핵심 혁신 기능**을 위한 **통합 API**를 제공합니다.

### 🔗 기본 URL
```
Base URL: http://localhost:3000/api/innovation
```

### 📊 API 상태
- **API 버전**: v3.0.0
- **상태**: Production Ready ✅
- **지원 형식**: JSON
- **인증**: Bearer Token

---

## 🌐 통합 혁신 플랫폼 API

### 📊 플랫폼 상태 조회

#### **GET** `/platform/status`

**설명**: 통합 혁신 플랫폼의 전체 상태를 조회합니다.

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-08-13T08:30:00.000Z",
    "overallHealth": "excellent",
    "activeFeatures": 4,
    "totalFeatures": 4,
    "featureStatuses": [
      {
        "id": "ai-auto-config",
        "name": "AI-powered Auto-Configuration System",
        "status": "active",
        "completion": 100,
        "metrics": {
          "accuracy": 95.8,
          "responseTime": 150,
          "throughput": 1000,
          "errorRate": 0.2
        }
      },
      {
        "id": "risk-management",
        "name": "Distributed Risk Management System",
        "status": "active",
        "completion": 100,
        "metrics": {
          "accuracy": 92.3,
          "responseTime": 200,
          "throughput": 800,
          "errorRate": 0.5
        }
      },
      {
        "id": "performance-prediction",
        "name": "Real-time Performance Prediction & Auto-Scaling",
        "status": "active",
        "completion": 100,
        "metrics": {
          "accuracy": 88.7,
          "responseTime": 300,
          "throughput": 600,
          "errorRate": 0.8
        }
      },
      {
        "id": "innovation-platform",
        "name": "Integrated Innovation Platform",
        "status": "active",
        "completion": 100,
        "metrics": {
          "accuracy": 91.2,
          "responseTime": 250,
          "throughput": 750,
          "errorRate": 0.4
        }
      }
    ],
    "platformMetrics": {
      "uptime": 86400000,
      "responseTime": 225,
      "throughput": 787,
      "errorRate": 0.48
    }
  }
}
```

**응답 필드**:
- `overallHealth`: 전체 건강도 (`excellent`, `good`, `fair`, `poor`)
- `activeFeatures`: 활성화된 기능 수
- `totalFeatures`: 전체 기능 수
- `featureStatuses`: 각 기능의 상세 상태
- `platformMetrics`: 플랫폼 전체 메트릭

---

### 🔧 플랫폼 제어

#### **POST** `/platform/start`

**설명**: 통합 혁신 플랫폼을 시작합니다.

**요청 본문**:
```json
{
  "autoScalingEnabled": true,
  "failurePredictionEnabled": true,
  "aiConfigurationEnabled": true,
  "crossFeatureOptimization": true
}
```

**응답**:
```json
{
  "success": true,
  "message": "통합 혁신 플랫폼이 성공적으로 시작되었습니다.",
  "data": {
    "startTime": "2025-08-13T08:30:00.000Z",
    "status": "running"
  }
}
```

#### **POST** `/platform/stop`

**설명**: 통합 혁신 플랫폼을 중지합니다.

**응답**:
```json
{
  "success": true,
  "message": "통합 혁신 플랫폼이 중지되었습니다.",
  "data": {
    "stopTime": "2025-08-13T08:35:00.000Z",
    "status": "stopped"
  }
}
```

---

## 🤖 AI 자동 구성 시스템 API

### 🔍 MCP 서버 매칭

#### **POST** `/ai/match`

**설명**: 사용자 요구사항에 맞는 최적의 MCP 서버를 매칭합니다.

**요청 본문**:
```json
{
  "intent": "GitHub 저장소 분석 및 문서화",
  "tools": ["code_analysis", "documentation", "git_operations"],
  "performance": "high",
  "security": "enterprise",
  "constraints": {
    "maxResponseTime": 1000,
    "minAccuracy": 0.8
  }
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "match": {
      "server": {
        "id": "github-enterprise",
        "name": "GitHub Enterprise MCP Server",
        "description": "GitHub 저장소 분석 및 문서화를 위한 엔터프라이즈급 서버",
        "capabilities": {
          "tools": ["code_analysis", "documentation", "git_operations"],
          "performance": "high",
          "security": "enterprise"
        }
      },
      "confidence": 0.95,
      "matchedFeatures": ["code_analysis", "documentation", "git_operations"],
      "score": 0.92
    },
    "alternatives": [
      {
        "server": {
          "id": "github-standard",
          "name": "GitHub Standard MCP Server",
          "confidence": 0.87
        }
      }
    ]
  }
}
```

**요청 필드**:
- `intent`: 사용자 의도 (필수)
- `tools`: 필요한 도구 목록 (선택)
- `performance`: 성능 요구사항 (`low`, `medium`, `high`)
- `security`: 보안 요구사항 (`basic`, `standard`, `enterprise`)
- `constraints`: 추가 제약사항 (선택)

---

### 🔄 워크플로우 생성

#### **POST** `/ai/workflow/generate`

**설명**: 매칭된 서버를 기반으로 워크플로우를 자동 생성합니다.

**요청 본문**:
```json
{
  "serverId": "github-enterprise",
  "intent": "GitHub 저장소 분석 및 문서화",
  "parameters": {
    "repository": "mcphub/mcphub",
    "analysisDepth": "comprehensive",
    "outputFormat": "markdown"
  }
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "workflow": {
      "id": "workflow-001",
      "steps": [
        {
          "id": "step-1",
          "name": "저장소 클론",
          "action": "git_clone",
          "parameters": {
            "repository": "mcphub/mcphub"
          },
          "estimatedTime": 5000
        },
        {
          "id": "step-2",
          "name": "코드 분석",
          "action": "code_analysis",
          "parameters": {
            "depth": "comprehensive"
          },
          "estimatedTime": 15000
        },
        {
          "id": "step-3",
          "name": "문서 생성",
          "action": "generate_documentation",
          "parameters": {
            "format": "markdown"
          },
          "estimatedTime": 10000
        }
      ],
      "totalEstimatedTime": 30000,
      "dependencies": [],
      "errorHandling": {
        "retryCount": 3,
        "fallbackStrategy": "use_cached_result"
      }
    }
  }
}
```

---

## ⚠️ 분산 위험 관리 시스템 API

### 🔮 장애 예측

#### **GET** `/risk/predictions/{hubId}`

**설명**: 특정 허브의 장애 예측 결과를 조회합니다.

**경로 매개변수**:
- `hubId`: 허브 ID (필수)

**쿼리 매개변수**:
- `timeHorizon`: 예측 시간 범위 (밀리초, 기본값: 300000)
- `includeHistory`: 히스토리 포함 여부 (기본값: false)

**응답**:
```json
{
  "success": true,
  "data": {
    "hubId": "hub-1",
    "timestamp": "2025-08-13T08:30:00.000Z",
    "predictions": [
      {
        "metric": "cpu",
        "currentValue": 85.5,
        "predictedValue": 92.3,
        "failureProbability": 0.78,
        "estimatedTimeToFailure": 480000,
        "confidence": 0.85,
        "riskLevel": "high",
        "recommendations": [
          "CPU 사용률 모니터링 강화",
          "리소스 스케일업 고려",
          "백그라운드 프로세스 최적화"
        ]
      },
      {
        "metric": "memory",
        "currentValue": 78.2,
        "predictedValue": 86.7,
        "failureProbability": 0.65,
        "estimatedTimeToFailure": 720000,
        "confidence": 0.82,
        "riskLevel": "medium",
        "recommendations": [
          "메모리 사용량 모니터링",
          "불필요한 프로세스 정리"
        ]
      }
    ],
    "overallRisk": "medium",
    "nextCheckTime": "2025-08-13T08:35:00.000Z"
  }
}
```

---

### 🚨 이상 징후 감지

#### **GET** `/risk/anomalies/{hubId}`

**설명**: 특정 허브의 이상 징후를 감지합니다.

**응답**:
```json
{
  "success": true,
  "data": {
    "hubId": "hub-1",
    "timestamp": "2025-08-13T08:30:00.000Z",
    "anomalies": [
      {
        "metric": "errorRate",
        "currentValue": 8.5,
        "baselineValue": 2.1,
        "deviation": 6.4,
        "severity": "high",
        "detectedAt": "2025-08-13T08:28:00.000Z",
        "description": "에러율이 정상 범위를 크게 초과했습니다."
      }
    ],
    "totalAnomalies": 1,
    "highestSeverity": "high"
  }
}
```

---

### 🛡️ 위험 완화

#### **POST** `/risk/mitigate`

**설명**: 감지된 위험에 대한 완화 조치를 실행합니다.

**요청 본문**:
```json
{
  "hubId": "hub-1",
  "anomalyId": "anomaly-001",
  "mitigationStrategy": "auto_scaling",
  "parameters": {
    "scaleUpFactor": 1.5,
    "maxInstances": 3
  }
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "mitigationId": "mitigation-001",
    "status": "executing",
    "estimatedCompletionTime": "2025-08-13T08:32:00.000Z",
    "actions": [
      "리소스 스케일업 시작",
      "로드 밸런서 재구성",
      "모니터링 강화"
    ]
  }
}
```

---

## 📊 실시간 성능 예측 API

### 🔮 성능 예측

#### **POST** `/performance/predict`

**설명**: 실시간 성능 예측을 실행합니다.

**요청 본문**:
```json
{
  "hubId": "hub-1",
  "timeHorizon": 300000,
  "includeTrends": true,
  "includeScalingRecommendations": true
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "hubId": "hub-1",
    "timestamp": "2025-08-13T08:30:00.000Z",
    "timeHorizon": 300000,
    "predictions": {
      "cpu": [85.5, 87.2, 89.1, 91.3, 93.8],
      "memory": [78.2, 79.8, 81.5, 83.2, 85.1],
      "responseTime": [300, 320, 350, 380, 420],
      "errorRate": [5.2, 5.8, 6.5, 7.2, 8.1]
    },
    "trends": {
      "cpu": 0.85,
      "memory": 0.72,
      "responseTime": 0.95,
      "errorRate": 0.68
    },
    "scalingDecision": {
      "action": "scale_up",
      "reason": "CPU 사용률 예측: 93.8% (임계값: 90%)",
      "priority": "high",
      "estimatedImpact": "significant"
    },
    "confidence": 85,
    "resourceDemand": {
      "cpu": {
        "current": 85.5,
        "predicted": 93.8,
        "required": 100
      },
      "memory": {
        "current": 78.2,
        "predicted": 85.1,
        "required": 90
      }
    },
    "riskLevel": "high",
    "recommendations": [
      "🚀 리소스 스케일업 권장",
      "📊 모니터링 강화 필요",
      "⚡ 응답 시간 최적화 검토"
    ]
  }
}
```

---

### 🔄 자동 스케일링

#### **POST** `/performance/scale`

**설명**: 자동 스케일링을 실행합니다.

**요청 본문**:
```json
{
  "hubId": "hub-1",
  "scalingDecision": {
    "action": "scale_up",
    "reason": "CPU 사용률 예측: 93.8% (임계값: 90%)",
    "priority": "high",
    "estimatedImpact": "significant"
  }
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "scalingId": "scaling-001",
    "status": "executing",
    "action": "scale_up",
    "startTime": "2025-08-13T08:30:00.000Z",
    "estimatedCompletionTime": "2025-08-13T08:31:00.000Z",
    "progress": {
      "currentStep": "리소스 할당",
      "completedSteps": ["검증", "계획 수립"],
      "remainingSteps": ["배포", "검증"]
    }
  }
}
```

---

### 📈 성능 메트릭

#### **GET** `/performance/metrics/{hubId}`

**설명**: 특정 허브의 성능 메트릭을 조회합니다.

**쿼리 매개변수**:
- `timeRange`: 시간 범위 (예: `1h`, `6h`, `24h`, 기본값: `1h`)
- `metrics`: 조회할 메트릭 (쉼표로 구분, 기본값: 모든 메트릭)

**응답**:
```json
{
  "success": true,
  "data": {
    "hubId": "hub-1",
    "timeRange": {
      "start": "2025-08-13T07:30:00.000Z",
      "end": "2025-08-13T08:30:00.000Z"
    },
    "metrics": {
      "cpu": {
        "current": 85.5,
        "average": 78.2,
        "peak": 93.8,
        "trend": "increasing"
      },
      "memory": {
        "current": 78.2,
        "average": 72.1,
        "peak": 85.1,
        "trend": "stable"
      },
      "responseTime": {
        "current": 300,
        "average": 280,
        "peak": 420,
        "trend": "increasing"
      },
      "errorRate": {
        "current": 5.2,
        "average": 4.8,
        "peak": 8.1,
        "trend": "increasing"
      }
    },
    "summary": {
      "overallHealth": "medium",
      "performanceScore": 72.5,
      "recommendations": [
        "CPU 사용률 모니터링 강화",
        "응답 시간 최적화 필요"
      ]
    }
  }
}
```

---

## ❌ 에러 코드 및 응답

### 🔴 공통 에러 코드

| 코드 | 메시지 | 설명 |
|------|--------|------|
| `400` | Bad Request | 잘못된 요청 형식 |
| `401` | Unauthorized | 인증 실패 |
| `403` | Forbidden | 권한 부족 |
| `404` | Not Found | 리소스를 찾을 수 없음 |
| `429` | Too Many Requests | 요청 한도 초과 |
| `500` | Internal Server Error | 서버 내부 오류 |
| `503` | Service Unavailable | 서비스 일시적 사용 불가 |

### 📝 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "PERFORMANCE_PREDICTION_FAILED",
    "message": "성능 예측 실행 중 오류가 발생했습니다.",
    "details": "외부 성능 에이전트 연결 실패",
    "timestamp": "2025-08-13T08:30:00.000Z",
    "requestId": "req-12345"
  }
}
```

### 🚨 기능별 에러 코드

#### **AI 자동 구성 시스템**
- `AI_MATCHING_FAILED`: AI 매칭 실패
- `WORKFLOW_GENERATION_FAILED`: 워크플로우 생성 실패
- `INVALID_REQUIREMENTS`: 잘못된 요구사항

#### **분산 위험 관리 시스템**
- `PREDICTION_FAILED`: 장애 예측 실패
- `ANOMALY_DETECTION_FAILED`: 이상 징후 감지 실패
- `MITIGATION_EXECUTION_FAILED`: 위험 완화 실행 실패

#### **실시간 성능 예측**
- `PERFORMANCE_PREDICTION_FAILED`: 성능 예측 실패
- `SCALING_EXECUTION_FAILED`: 스케일링 실행 실패
- `METRICS_COLLECTION_FAILED`: 메트릭 수집 실패

---

## 🔐 인증 및 권한

### 🔑 인증 방식

#### **Bearer Token**
```http
Authorization: Bearer <your-access-token>
```

#### **API Key**
```http
X-API-Key: <your-api-key>
```

### 🛡️ 권한 레벨

| 권한 | 설명 | API 엔드포인트 |
|------|------|----------------|
| `read` | 읽기 전용 | GET 요청 |
| `write` | 읽기/쓰기 | GET, POST, PUT 요청 |
| `admin` | 관리자 | 모든 요청 |
| `system` | 시스템 | 내부 시스템 전용 |

### 📋 권한 매트릭스

| 기능 | 읽기 | 쓰기 | 관리자 |
|------|------|------|--------|
| 플랫폼 상태 | ✅ | ❌ | ✅ |
| AI 매칭 | ✅ | ✅ | ✅ |
| 워크플로우 생성 | ✅ | ✅ | ✅ |
| 장애 예측 | ✅ | ✅ | ✅ |
| 성능 예측 | ✅ | ✅ | ✅ |
| 자동 스케일링 | ✅ | ✅ | ✅ |
| 플랫폼 제어 | ❌ | ❌ | ✅ |

---

## 📊 API 사용량 및 제한

### 🚦 요청 제한

| API 그룹 | 요청 제한 | 시간 범위 |
|----------|-----------|-----------|
| 플랫폼 상태 | 1000 | 1분 |
| AI 매칭 | 500 | 1분 |
| 장애 예측 | 200 | 1분 |
| 성능 예측 | 300 | 1분 |
| 자동 스케일링 | 50 | 1분 |

### 📈 사용량 모니터링

#### **GET** `/usage/current`

**응답**:
```json
{
  "success": true,
  "data": {
    "currentPeriod": "2025-08-13T08:00:00.000Z",
    "usage": {
      "platformStatus": {
        "requests": 45,
        "limit": 1000,
        "remaining": 955
      },
      "aiMatching": {
        "requests": 23,
        "limit": 500,
        "remaining": 477
      },
      "riskPrediction": {
        "requests": 12,
        "limit": 200,
        "remaining": 188
      }
    },
    "nextResetTime": "2025-08-13T09:00:00.000Z"
  }
}
```

---

## 🔧 개발자 도구

### 📝 API 테스트

#### **Postman Collection**
```json
{
  "info": {
    "name": "MCPHub v3.0 Innovation Features API",
    "version": "3.0.0"
  },
  "item": [
    {
      "name": "Platform Status",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/innovation/platform/status"
      }
    }
  ]
}
```

#### **cURL 예시**
```bash
# 플랫폼 상태 조회
curl -X GET "http://localhost:3000/api/innovation/platform/status" \
  -H "Authorization: Bearer <your-token>"

# AI 서버 매칭
curl -X POST "http://localhost:3000/api/innovation/ai/match" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "intent": "GitHub 저장소 분석",
    "tools": ["code_analysis", "documentation"],
    "performance": "high"
  }'
```

---

## 📞 지원 및 문의

### 🆘 기술 지원
- **API 문서**: 이 문서 참조
- **GitHub Issues**: [MCPHub Repository](https://github.com/mcphub/mcphub)
- **이메일**: api-support@mcphub.com

### 📋 변경 이력

| 버전 | 날짜 | 변경사항 |
|------|------|----------|
| 3.0.0 | 2025-08-13 | 초기 릴리즈 |
| 3.0.1 | 예정 | 성능 개선 및 버그 수정 |

---

**🎉 MCPHub v3.0 혁신 기능 API를 활용하여 더욱 스마트하고 효율적인 시스템을 구축하세요!**
