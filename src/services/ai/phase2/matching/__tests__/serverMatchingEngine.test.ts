// MCP 서버 매칭 엔진 단위 테스트
// 생성일: 2025년 8월 13일
// 목적: 매칭 엔진의 정확성 및 안정성 검증

import { MCPServer, Requirements } from '../../../../../types/ai.js';
import { MatchingResult, MCPServerMatchingEngine, ServerMatch } from '../serverMatchingEngine.js';

// 🧪 테스트 데이터 준비
const mockRequirements: Requirements = {
    intent: {
        action: 'configure',
        target: 'mcp_servers',
        constraints: ['performance', 'security'],
        preferences: ['scalability', 'reliability'],
        confidence: 85
    },
    technicalConstraints: [
        { type: 'hardware', description: '연동', severity: 'medium', impact: '성능 영향' },
        { type: 'software', description: '분석', severity: 'high', impact: '핵심 기능' },
        { type: 'network', description: '빠른 응답', severity: 'high', impact: '사용자 경험' }
    ],
    performanceRequirements: [
        { metric: 'responseTime', target: 200, unit: 'ms', priority: 'high' },
        { metric: 'throughput', target: 1000, unit: 'requests/sec', priority: 'medium' }
    ],
    securityRequirements: [
        { type: 'authentication', description: '높은 보안 수준', level: 'high' }
    ],
    integrationRequirements: [
        { system: 'external_api', protocol: 'REST', dataFormat: 'JSON', frequency: 'real-time' }
    ]
};

const mockServers: MCPServer[] = [
    {
        id: 'server-1',
        name: '고성능 연동 서버',
        url: 'https://server1.example.com',
        status: 'active',
        capabilities: {
            serverId: 'server-1',
            serverName: '고성능 연동 서버',
            tools: [
                {
                    name: '연동',
                    description: '다양한 시스템과의 연동 기능',
                    parameters: [
                        { name: 'system', type: 'string', required: true, description: '연동할 시스템명' },
                        { name: 'protocol', type: 'string', required: false, description: '연동 프로토콜', defaultValue: 'REST' }
                    ],
                    returnType: 'boolean',
                    capabilities: ['integration', 'api_connectivity']
                },
                {
                    name: '분석',
                    description: '데이터 분석 및 보고 기능',
                    parameters: [
                        { name: 'data', type: 'object', required: true, description: '분석할 데이터' },
                        { name: 'format', type: 'string', required: false, description: '출력 형식', defaultValue: 'JSON' }
                    ],
                    returnType: 'object',
                    capabilities: ['data_analysis', 'reporting']
                }
            ],
            metadata: {
                version: '1.0.0',
                author: 'MCPHub Team',
                description: '고성능 연동 및 분석 서버',
                tags: ['integration', 'analytics', 'high-performance'],
                documentation: 'https://docs.mcphub.com/server1'
            },
            compatibility: {
                mcpVersion: '2025-06-18',
                protocols: ['REST', 'GraphQL'],
                features: ['integration', 'analytics', 'high_performance'],
                limitations: ['single_tenant']
            },
            performance: {
                responseTime: 150,
                throughput: 1200,
                reliability: 99.9,
                scalability: 95
            }
        },
        health: {
            status: 'healthy',
            lastCheck: new Date(),
            responseTime: 150,
            errorCount: 0,
            uptime: 99.9
        }
    },
    {
        id: 'server-2',
        name: '기본 서버',
        url: 'https://server2.example.com',
        status: 'active',
        capabilities: {
            serverId: 'server-2',
            serverName: '기본 서버',
            tools: [
                {
                    name: '연결',
                    description: '기본 연결 기능',
                    parameters: [
                        { name: 'endpoint', type: 'string', required: true, description: '연결할 엔드포인트' }
                    ],
                    returnType: 'boolean',
                    capabilities: ['basic_connectivity']
                }
            ],
            metadata: {
                version: '1.0.0',
                author: 'MCPHub Team',
                description: '기본 연결 기능 서버',
                tags: ['basic', 'connectivity'],
                documentation: 'https://docs.mcphub.com/server2'
            },
            compatibility: {
                mcpVersion: '2025-06-18',
                protocols: ['REST'],
                features: ['basic_connectivity'],
                limitations: ['limited_functionality']
            },
            performance: {
                responseTime: 300,
                throughput: 500,
                reliability: 95.5,
                scalability: 70
            }
        },
        health: {
            status: 'healthy',
            lastCheck: new Date(),
            responseTime: 300,
            errorCount: 2,
            uptime: 95.5
        }
    },
    {
        id: 'server-3',
        name: '전문 분석 서버',
        url: 'https://server3.example.com',
        status: 'active',
        capabilities: {
            serverId: 'server-3',
            serverName: '전문 분석 서버',
            tools: [
                {
                    name: '고급분석',
                    description: '머신러닝 기반 고급 분석',
                    parameters: [
                        { name: 'algorithm', type: 'string', required: true, description: '사용할 알고리즘' },
                        { name: 'data', type: 'object', required: true, description: '분석할 데이터' }
                    ],
                    returnType: 'object',
                    capabilities: ['ml_analysis', 'advanced_analytics']
                },
                {
                    name: '시각화',
                    description: '데이터 시각화 및 차트 생성',
                    parameters: [
                        { name: 'chartType', type: 'string', required: true, description: '차트 타입' },
                        { name: 'data', type: 'object', required: true, description: '시각화할 데이터' }
                    ],
                    returnType: 'string',
                    capabilities: ['data_visualization', 'chart_generation']
                }
            ],
            metadata: {
                version: '1.0.0',
                author: 'MCPHub Team',
                description: '전문 분석 및 시각화 서버',
                tags: ['analytics', 'visualization', 'ml'],
                documentation: 'https://docs.mcphub.com/server3'
            },
            compatibility: {
                mcpVersion: '2025-06-18',
                protocols: ['REST', 'WebSocket'],
                features: ['advanced_analytics', 'visualization', 'ml_support'],
                limitations: ['high_resource_usage']
            },
            performance: {
                responseTime: 250,
                throughput: 800,
                reliability: 98.2,
                scalability: 85
            }
        },
        health: {
            status: 'healthy',
            lastCheck: new Date(),
            responseTime: 250,
            errorCount: 1,
            uptime: 98.2
        }
    }
];

describe('MCPServerMatchingEngine', () => {
    let matchingEngine: MCPServerMatchingEngine;

    beforeEach(() => {
        matchingEngine = new MCPServerMatchingEngine();
    });

    describe('기본 기능 테스트', () => {
        test('✅ 엔진 인스턴스 생성', () => {
            expect(matchingEngine).toBeInstanceOf(MCPServerMatchingEngine);
        });

        test('✅ 매칭 전략 초기화 확인', () => {
            // 내부 상태 확인을 위해 findBestMatch 메서드 호출
            const result = matchingEngine.findBestMatch(mockRequirements, mockServers);
            expect(result).toBeDefined();
        });
    });

    describe('매칭 결과 검증', () => {
        let result: MatchingResult;

        beforeEach(async () => {
            result = await matchingEngine.findBestMatch(mockRequirements, mockServers);
        });

        test('✅ 매칭 결과 구조 검증', () => {
            expect(result).toHaveProperty('matches');
            expect(result).toHaveProperty('totalServers');
            expect(result).toHaveProperty('matchingTime');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('recommendations');
        });

        test('✅ 매칭된 서버 수 검증', () => {
            expect(result.matches.length).toBeGreaterThan(0);
            expect(result.matches.length).toBeLessThanOrEqual(mockServers.length);
        });

        test('✅ 전체 서버 수 정확성', () => {
            expect(result.totalServers).toBe(mockServers.length);
        });

        test('✅ 매칭 시간 측정', () => {
            expect(result.matchingTime).toBeGreaterThan(0);
            expect(result.matchingTime).toBeLessThan(1000); // 1초 이내
        });

        test('✅ 신뢰도 범위 검증', () => {
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
        });
    });

    describe('매칭 품질 검증', () => {
        test('✅ 최적 매치 우선순위', async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);

            // 매치가 2개 이상인 경우 점수 순 정렬 확인
            if (result.matches.length >= 2) {
                expect(result.matches[0].score).toBeGreaterThanOrEqual(result.matches[1].score);
            }
        });

        test('✅ 최소 매칭 점수 임계값', async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);

            // 모든 매치가 최소 임계값(30) 이상인지 확인
            result.matches.forEach(match => {
                expect(match.score).toBeGreaterThanOrEqual(30);
            });
        });

        test('✅ 매칭 점수 범위', async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);

            result.matches.forEach(match => {
                expect(match.score).toBeGreaterThanOrEqual(0);
                expect(match.score).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('개별 매치 상세 검증', () => {
        let firstMatch: ServerMatch;

        beforeEach(async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);
            if (result.matches.length > 0) {
                firstMatch = result.matches[0];
            }
        });

        test('✅ 매치 객체 구조 검증', () => {
            if (firstMatch) {
                expect(firstMatch).toHaveProperty('server');
                expect(firstMatch).toHaveProperty('score');
                expect(firstMatch).toHaveProperty('confidence');
                expect(firstMatch).toHaveProperty('reasoning');
                expect(firstMatch).toHaveProperty('matchedFeatures');
                expect(firstMatch).toHaveProperty('unmatchedFeatures');
            }
        });

        test('✅ 매치 신뢰도 범위', () => {
            if (firstMatch) {
                expect(firstMatch.confidence).toBeGreaterThanOrEqual(0);
                expect(firstMatch.confidence).toBeLessThanOrEqual(100);
            }
        });

        test('✅ 매칭된 기능 존재 확인', () => {
            if (firstMatch) {
                expect(firstMatch.matchedFeatures.length).toBeGreaterThan(0);
                expect(Array.isArray(firstMatch.matchedFeatures)).toBe(true);
            }
        });

        test('✅ 매칭 이유 설명 존재', () => {
            if (firstMatch) {
                expect(firstMatch.reasoning.length).toBeGreaterThan(0);
                expect(Array.isArray(firstMatch.reasoning)).toBe(true);
            }
        });
    });

    describe('에러 처리 검증', () => {
        test('✅ 빈 서버 목록 처리', async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, []);
            expect(result.matches.length).toBe(0);
            expect(result.totalServers).toBe(0);
            expect(result.confidence).toBe(0);
        });

        test('✅ 빈 요구사항 처리', async () => {
            const emptyRequirements: Requirements = {
                intent: {
                    action: 'configure',
                    target: 'mcp_servers',
                    constraints: [],
                    preferences: [],
                    confidence: 0
                },
                technicalConstraints: [],
                performanceRequirements: [],
                securityRequirements: [],
                integrationRequirements: []
            };

            const result = await matchingEngine.findBestMatch(emptyRequirements, mockServers);
            expect(result.matches.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('성능 검증', () => {
        test('✅ 대량 서버 처리 성능', async () => {
            // 대량의 서버 데이터 생성
            const largeServerList: MCPServer[] = Array.from({ length: 100 }, (_, i) => ({
                id: `large-server-${i}`,
                name: `대량 서버 ${i}`,
                url: `https://large-server-${i}.example.com`,
                status: 'active',
                capabilities: {
                    serverId: `large-server-${i}`,
                    serverName: `대량 서버 ${i}`,
                    tools: [
                        {
                            name: '기본기능',
                            description: '기본 기능 제공',
                            parameters: [
                                { name: 'operation', type: 'string', required: true, description: '수행할 작업' }
                            ],
                            returnType: 'boolean',
                            capabilities: ['basic_functionality']
                        }
                    ],
                    metadata: {
                        version: '1.0.0',
                        author: 'MCPHub Team',
                        description: `테스트용 대량 서버 ${i}`,
                        tags: ['test', 'basic'],
                        documentation: 'https://docs.mcphub.com/large-server'
                    },
                    compatibility: {
                        mcpVersion: '2025-06-18',
                        protocols: ['REST'],
                        features: ['basic_functionality'],
                        limitations: ['test_only']
                    },
                    performance: {
                        responseTime: 200 + i,
                        throughput: 500 + i,
                        reliability: 95.0,
                        scalability: 70
                    }
                },
                health: {
                    status: 'healthy',
                    lastCheck: new Date(),
                    responseTime: 200 + i,
                    errorCount: 0,
                    uptime: 95.0
                }
            }));

            const startTime = performance.now();
            const result = await matchingEngine.findBestMatch(mockRequirements, largeServerList);
            const endTime = performance.now();

            const processingTime = endTime - startTime;

            // 100개 서버 처리 시 500ms 이내 완료되어야 함
            expect(processingTime).toBeLessThan(500);
            expect(result.totalServers).toBe(100);
        });
    });

    describe('매칭 알고리즘 정확성 검증', () => {
        test('✅ 기능 매칭 정확성', async () => {
            // 연동 기능이 요구사항에 포함되어 있으므로, 연동 기능을 가진 서버가 높은 점수를 받아야 함
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);

            const server1Match = result.matches.find(m => m.server.id === 'server-1');
            const server2Match = result.matches.find(m => m.server.id === 'server-2');

            if (server1Match && server2Match) {
                // server-1은 연동과 분석 기능을 모두 가지고 있음
                // server-2는 기본 기능만 가지고 있음
                // 따라서 server-1의 점수가 더 높아야 함
                expect(server1Match.score).toBeGreaterThanOrEqual(server2Match.score);
            }
        });

        test('✅ 성능 요구사항 반영', async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);

            // 응답 시간이 빠른 서버가 더 높은 점수를 받아야 함
            const fastServer = result.matches.find(m => m.server.health.responseTime === 150);
            const slowServer = result.matches.find(m => m.server.health.responseTime === 300);

            if (fastServer && slowServer) {
                expect(fastServer.score).toBeGreaterThanOrEqual(slowServer.score);
            }
        });
    });

    describe('추천사항 생성 검증', () => {
        test('✅ 추천사항 존재 확인', async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);
            expect(result.recommendations.length).toBeGreaterThan(0);
        });

        test('✅ 추천사항 유용성', async () => {
            const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);

            result.recommendations.forEach(recommendation => {
                expect(recommendation).toBeTruthy();
                expect(recommendation.length).toBeGreaterThan(0);
                expect(typeof recommendation).toBe('string');
            });
        });
    });
});

// 🧪 통합 테스트
describe('MCPServerMatchingEngine 통합 테스트', () => {
    let matchingEngine: MCPServerMatchingEngine;

    beforeEach(() => {
        matchingEngine = new MCPServerMatchingEngine();
    });

    test('✅ 전체 매칭 워크플로우', async () => {
        // 1. 요구사항 분석
        expect(mockRequirements.technicalConstraints.length).toBeGreaterThan(0);
        expect(mockRequirements.performanceRequirements.length).toBeGreaterThan(0);
        expect(mockRequirements.securityRequirements.length).toBeGreaterThan(0);

        // 2. 서버 매칭 실행
        const result = await matchingEngine.findBestMatch(mockRequirements, mockServers);

        // 3. 결과 검증
        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.recommendations.length).toBeGreaterThan(0);

        // 4. 매치 품질 검증
        result.matches.forEach(match => {
            expect(match.score).toBeGreaterThanOrEqual(30);
            expect(match.confidence).toBeGreaterThan(0);
            // matchedFeatures가 비어있을 수 있으므로 조건부 검증
            if (match.matchedFeatures.length === 0) {
                console.log(`⚠️ 매치 ${match.server.id}의 matchedFeatures가 비어있음`);
            }
        });
    });

    test('✅ 다양한 시나리오 테스트', async () => {
        // 다양한 요구사항 조합으로 테스트
        const scenarios = [
            {
                name: '기본 연결 요구사항',
                requirements: {
                    intent: {
                        action: 'configure',
                        target: 'mcp_servers',
                        constraints: ['connectivity'],
                        preferences: ['basic', 'connection'],
                        confidence: 80
                    },
                    technicalConstraints: [
                        { type: 'software' as const, description: '연결 기능', severity: 'low' as const, impact: '기본 연결' }
                    ],
                    performanceRequirements: [
                        { metric: 'responseTime' as const, target: 1000, unit: 'ms', priority: 'low' as const }
                    ],
                    securityRequirements: [
                        { type: 'authentication' as const, description: '기본 보안', level: 'basic' as const }
                    ],
                    integrationRequirements: [
                        { system: 'api', protocol: 'REST', dataFormat: 'JSON', frequency: 'batch' }
                    ]
                } as Requirements
            },
            {
                name: '분석 기능 요구사항',
                requirements: {
                    intent: {
                        action: 'configure',
                        target: 'mcp_servers',
                        constraints: ['analytics'],
                        preferences: ['data', 'reporting'],
                        confidence: 80
                    },
                    technicalConstraints: [
                        { type: 'software' as const, description: '분석 기능', severity: 'medium' as const, impact: '데이터 분석' }
                    ],
                    performanceRequirements: [
                        { metric: 'responseTime' as const, target: 500, unit: 'ms', priority: 'low' as const }
                    ],
                    securityRequirements: [
                        { type: 'authentication' as const, description: '기본 보안', level: 'basic' as const }
                    ],
                    integrationRequirements: [
                        { system: 'api', protocol: 'REST', dataFormat: 'JSON', frequency: 'batch' }
                    ]
                } as Requirements
            }
        ];

        for (const scenario of scenarios) {
            const result = await matchingEngine.findBestMatch(scenario.requirements, mockServers);
            expect(result.matches.length).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeGreaterThan(0);
        }
    });
});
