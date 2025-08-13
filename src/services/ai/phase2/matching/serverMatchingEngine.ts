// MCP 서버 자동 매칭 엔진 - Phase 2
// 생성일: 2025년 8월 13일
// 목적: 사용자 요구사항과 MCP 서버를 자동으로 매칭하는 고급 알고리즘

import { MCPServer, Requirements } from '../../../types/ai';

export interface ServerMatch {
    server: MCPServer;
    score: number;
    confidence: number;
    reasoning: string[];
    matchedFeatures: string[];
    unmatchedFeatures: string[];
    estimatedCost: number;
    estimatedPerformance: number;
}

export interface MatchingStrategy {
    name: string;
    weight: number;
    calculateScore(requirements: Requirements, server: MCPServer): Promise<number>;
}

export interface MatchingResult {
    matches: ServerMatch[];
    totalServers: number;
    matchingTime: number;
    confidence: number;
    recommendations: string[];
}

export class MCPServerMatchingEngine {
    private readonly matchingStrategies: Map<string, MatchingStrategy>;
    private readonly minimumThreshold: number = 60; // 최소 매칭 점수
    private readonly maxResults: number = 10; // 최대 결과 수

    constructor() {
        this.matchingStrategies = new Map();
        this.initializeStrategies();
    }

    // 🚀 사용자 요구사항과 MCP 서버 자동 매칭
    async findBestMatch(userRequirements: Requirements, availableServers: MCPServer[]): Promise<MatchingResult> {
        const startTime = performance.now();
        console.log(`🔍 MCP 서버 매칭 시작: ${availableServers.length}개 서버 분석`);

        const matches: ServerMatch[] = [];

        // 각 서버에 대해 매칭 점수 계산
        for (const server of availableServers) {
            try {
                const score = await this.calculateMatchingScore(userRequirements, server);

                if (score > this.minimumThreshold) {
                    const match = await this.createServerMatch(userRequirements, server, score);
                    matches.push(match);
                }
            } catch (error) {
                console.warn(`⚠️ 서버 매칭 중 오류 발생: ${server.serverId}`, error);
            }
        }

        // 점수 순으로 정렬하여 최적 매치 반환
        const sortedMatches = matches.sort((a, b) => b.score - a.score);
        const topMatches = sortedMatches.slice(0, this.maxResults);

        const matchingTime = performance.now() - startTime;
        const confidence = this.calculateOverallConfidence(topMatches);

        console.log(`✅ MCP 서버 매칭 완료: ${topMatches.length}개 매치, ${matchingTime.toFixed(2)}ms`);

        return {
            matches: topMatches,
            totalServers: availableServers.length,
            matchingTime,
            confidence,
            recommendations: this.generateRecommendations(topMatches, userRequirements)
        };
    }

    // 🧮 종합 매칭 점수 계산
    private async calculateMatchingScore(requirements: Requirements, server: MCPServer): Promise<number> {
        let totalScore = 0;
        let maxPossibleScore = 0;

        // 각 매칭 전략별 점수 계산
        for (const [strategyName, strategy] of this.matchingStrategies) {
            try {
                const score = await strategy.calculateScore(requirements, server);
                const weightedScore = score * strategy.weight;

                totalScore += weightedScore;
                maxPossibleScore += 100 * strategy.weight;

                console.log(`📊 ${strategyName}: ${score.toFixed(1)} × ${strategy.weight} = ${weightedScore.toFixed(1)}`);
            } catch (error) {
                console.warn(`⚠️ ${strategyName} 전략 실행 중 오류:`, error);
            }
        }

        const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
        return Math.round(finalScore * 100) / 100; // 소수점 2자리까지
    }

    // 🎯 매칭 전략 초기화
    private initializeStrategies(): void {
        // 기능 매칭 전략 (40% 가중치)
        this.matchingStrategies.set('feature', {
            name: '기능 매칭',
            weight: 0.4,
            calculateScore: this.calculateFeatureMatch.bind(this)
        });

        // 성능 매칭 전략 (30% 가중치)
        this.matchingStrategies.set('performance', {
            name: '성능 매칭',
            weight: 0.3,
            calculateScore: this.calculatePerformanceMatch.bind(this)
        });

        // 보안 매칭 전략 (20% 가중치)
        this.matchingStrategies.set('security', {
            name: '보안 매칭',
            weight: 0.2,
            calculateScore: this.calculateSecurityMatch.bind(this)
        });

        // 비용 매칭 전략 (10% 가중치)
        this.matchingStrategies.set('cost', {
            name: '비용 매칭',
            weight: 0.1,
            calculateScore: this.calculateCostMatch.bind(this)
        });
    }

    // 🔧 기능 매칭 점수 계산
    private async calculateFeatureMatch(requirements: Requirements, server: MCPServer): Promise<number> {
        const requiredFeatures = this.extractRequiredFeatures(requirements);
        const availableFeatures = this.extractAvailableFeatures(server);

        let matchedFeatures = 0;
        let totalRequired = requiredFeatures.length;

        for (const requiredFeature of requiredFeatures) {
            if (availableFeatures.some(available =>
                this.isFeatureCompatible(requiredFeature, available)
            )) {
                matchedFeatures++;
            }
        }

        return totalRequired > 0 ? (matchedFeatures / totalRequired) * 100 : 100;
    }

    // ⚡ 성능 매칭 점수 계산
    private async calculatePerformanceMatch(requirements: Requirements, server: MCPServer): Promise<number> {
        const performanceReqs = requirements.performanceRequirements;
        const serverPerformance = server.performance;

        if (!performanceReqs.length || !serverPerformance) {
            return 70; // 기본 점수
        }

        let totalScore = 0;
        let totalWeight = 0;

        for (const req of performanceReqs) {
            const weight = this.getPerformanceRequirementWeight(req.type);
            const score = this.calculatePerformanceScore(req, serverPerformance);

            totalScore += score * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? totalScore / totalWeight : 70;
    }

    // 🛡️ 보안 매칭 점수 계산
    private async calculateSecurityMatch(requirements: Requirements, server: MCPServer): Promise<number> {
        const securityReqs = requirements.securityRequirements;
        const serverSecurity = server.metadata?.security;

        if (!securityReqs.length || !serverSecurity) {
            return 80; // 기본 보안 점수
        }

        let totalScore = 0;
        let totalWeight = 0;

        for (const req of securityReqs) {
            const weight = this.getSecurityRequirementWeight(req.level);
            const score = this.calculateSecurityScore(req, serverSecurity);

            totalScore += score * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? totalScore / totalWeight : 80;
    }

    // 💰 비용 매칭 점수 계산
    private async calculateCostMatch(requirements: Requirements, server: MCPServer): Promise<number> {
        const costConstraints = requirements.technicalConstraints.filter(c =>
            c.type === 'cost' || c.description.includes('비용') || c.description.includes('cost')
        );

        if (!costConstraints.length) {
            return 70; // 비용 제약사항이 없으면 기본 점수
        }

        // 비용 제약사항 분석 및 점수 계산
        const costScore = this.analyzeCostConstraints(costConstraints, server);
        return Math.max(0, Math.min(100, costScore));
    }

    // 🎯 서버 매치 객체 생성
    private async createServerMatch(
        requirements: Requirements,
        server: MCPServer,
        score: number
    ): Promise<ServerMatch> {
        const matchedFeatures = this.getMatchedFeatures(requirements, server);
        const unmatchedFeatures = this.getUnmatchedFeatures(requirements, server);
        const reasoning = this.generateMatchingReasoning(requirements, server, score);

        return {
            server,
            score,
            confidence: this.calculateMatchConfidence(score, matchedFeatures.length, unmatchedFeatures.length),
            reasoning,
            matchedFeatures,
            unmatchedFeatures,
            estimatedCost: this.estimateServerCost(server),
            estimatedPerformance: this.estimateServerPerformance(server)
        };
    }

    // 🔍 매칭된 기능 추출
    private getMatchedFeatures(requirements: Requirements, server: MCPServer): string[] {
        const requiredFeatures = this.extractRequiredFeatures(requirements);
        const availableFeatures = this.extractAvailableFeatures(server);

        return requiredFeatures.filter(required =>
            availableFeatures.some(available =>
                this.isFeatureCompatible(required, available)
            )
        );
    }

    // ❌ 매칭되지 않은 기능 추출
    private getUnmatchedFeatures(requirements: Requirements, server: MCPServer): string[] {
        const requiredFeatures = this.extractRequiredFeatures(requirements);
        const matchedFeatures = this.getMatchedFeatures(requirements, server);

        return requiredFeatures.filter(feature =>
            !matchedFeatures.includes(feature)
        );
    }

    // 💡 매칭 이유 생성
    private generateMatchingReasoning(
        requirements: Requirements,
        server: MCPServer,
        score: number
    ): string[] {
        const reasoning: string[] = [];

        if (score >= 90) {
            reasoning.push('🎯 거의 완벽한 기능 매칭');
            reasoning.push('⚡ 우수한 성능 및 안정성');
            reasoning.push('🛡️ 높은 보안 수준');
        } else if (score >= 80) {
            reasoning.push('✅ 대부분의 요구사항 충족');
            reasoning.push('📊 양호한 성능 지표');
        } else if (score >= 70) {
            reasoning.push('⚠️ 주요 요구사항은 충족하나 일부 기능 부족');
            reasoning.push('💡 추가 설정 또는 플러그인 필요 가능성');
        } else {
            reasoning.push('❌ 기본 요구사항만 충족');
            reasoning.push('🔧 상당한 추가 개발 작업 필요');
        }

        // 구체적인 매칭 정보 추가
        const matchedFeatures = this.getMatchedFeatures(requirements, server);
        if (matchedFeatures.length > 0) {
            reasoning.push(`✅ 매칭된 기능: ${matchedFeatures.join(', ')}`);
        }

        const unmatchedFeatures = this.getUnmatchedFeatures(requirements, server);
        if (unmatchedFeatures.length > 0) {
            reasoning.push(`❌ 부족한 기능: ${unmatchedFeatures.join(', ')}`);
        }

        return reasoning;
    }

    // 📊 전체 신뢰도 계산
    private calculateOverallConfidence(matches: ServerMatch[]): number {
        if (matches.length === 0) return 0;

        const totalConfidence = matches.reduce((sum, match) => sum + match.confidence, 0);
        const averageConfidence = totalConfidence / matches.length;

        // 매치 수에 따른 보너스 점수
        const matchBonus = Math.min(10, matches.length * 2);

        return Math.min(100, averageConfidence + matchBonus);
    }

    // 💡 추천사항 생성
    private generateRecommendations(matches: ServerMatch[], requirements: Requirements): string[] {
        const recommendations: string[] = [];

        if (matches.length === 0) {
            recommendations.push('🔍 요구사항에 맞는 MCP 서버를 찾을 수 없습니다.');
            recommendations.push('💡 요구사항을 조정하거나 새로운 서버 추가를 고려해보세요.');
            return recommendations;
        }

        const topMatch = matches[0];

        if (topMatch.score >= 90) {
            recommendations.push('🎯 최고 매치: 이 서버를 우선적으로 고려하세요.');
        } else if (topMatch.score >= 80) {
            recommendations.push('✅ 우수한 매치: 이 서버로 시작하고 부족한 기능을 보완하세요.');
        } else {
            recommendations.push('⚠️ 보통 매치: 추가 개발 작업이 필요할 수 있습니다.');
        }

        // 구체적인 개선 제안
        if (topMatch.unmatchedFeatures.length > 0) {
            recommendations.push(`🔧 부족한 기능: ${topMatch.unmatchedFeatures.join(', ')}`);
            recommendations.push('💡 플러그인 개발 또는 서버 확장을 고려해보세요.');
        }

        // 성능 최적화 제안
        if (topMatch.estimatedPerformance < 80) {
            recommendations.push('⚡ 성능 최적화: 서버 설정 조정 또는 리소스 증설을 고려하세요.');
        }

        return recommendations;
    }

    // 🔧 유틸리티 메서드들
    private extractRequiredFeatures(requirements: Requirements): string[] {
        // 요구사항에서 필요한 기능들을 추출하는 로직
        const features: string[] = [];

        // 기술적 제약사항에서 기능 추출
        requirements.technicalConstraints.forEach(constraint => {
            if (constraint.type === 'feature') {
                features.push(constraint.description);
            }
        });

        // 성능 요구사항에서 기능 추출
        requirements.performanceRequirements.forEach(req => {
            if (req.type === 'functionality') {
                features.push(req.description);
            }
        });

        return features;
    }

    private extractAvailableFeatures(server: MCPServer): string[] {
        // 서버에서 제공하는 기능들을 추출하는 로직
        const features: string[] = [];

        server.tools.forEach(tool => {
            features.push(tool.name);
            features.push(...tool.description.split(' ').filter(word =>
                word.length > 3 && !['the', 'and', 'for', 'with'].includes(word.toLowerCase())
            ));
        });

        return features;
    }

    private isFeatureCompatible(required: string, available: string): boolean {
        // 기능 호환성 검사 로직
        const requiredLower = required.toLowerCase();
        const availableLower = available.toLowerCase();

        // 정확한 매칭
        if (requiredLower === availableLower) return true;

        // 부분 매칭
        if (availableLower.includes(requiredLower) || requiredLower.includes(availableLower)) return true;

        // 동의어 매칭
        const synonyms = this.getFeatureSynonyms(requiredLower);
        return synonyms.some(synonym => availableLower.includes(synonym));
    }

    private getFeatureSynonyms(feature: string): string[] {
        // 기능별 동의어 매핑
        const synonymMap: Record<string, string[]> = {
            '연동': ['integration', 'connect', 'link', 'sync'],
            '연결': ['connection', 'link', 'connect', 'join'],
            '통합': ['integration', 'unify', 'merge', 'combine'],
            '생성': ['create', 'generate', 'build', 'make'],
            '관리': ['manage', 'administer', 'control', 'handle'],
            '모니터링': ['monitor', 'track', 'observe', 'watch'],
            '분석': ['analyze', 'examine', 'study', 'investigate'],
            '보고': ['report', 'document', 'record', 'log']
        };

        return synonymMap[feature] || [];
    }

    private getPerformanceRequirementWeight(type: string): number {
        const weights: Record<string, number> = {
            'response_time': 0.4,
            'throughput': 0.3,
            'availability': 0.2,
            'scalability': 0.1
        };

        return weights[type] || 0.25;
    }

    private calculatePerformanceScore(req: any, serverPerformance: any): number {
        // 성능 요구사항과 서버 성능을 비교하여 점수 계산
        // 실제 구현에서는 더 복잡한 로직이 필요
        return 75; // 기본 점수
    }

    private getSecurityRequirementWeight(level: string): number {
        const weights: Record<string, number> = {
            'critical': 0.5,
            'high': 0.3,
            'medium': 0.15,
            'low': 0.05
        };

        return weights[level] || 0.25;
    }

    private calculateSecurityScore(req: any, serverSecurity: any): number {
        // 보안 요구사항과 서버 보안 수준을 비교하여 점수 계산
        return 80; // 기본 점수
    }

    private analyzeCostConstraints(constraints: any[], server: MCPServer): number {
        // 비용 제약사항 분석 및 점수 계산
        return 70; // 기본 점수
    }

    private calculateMatchConfidence(score: number, matchedCount: number, unmatchedCount: number): number {
        let confidence = score;

        // 매칭된 기능 수에 따른 보너스
        if (matchedCount > 0) {
            confidence += Math.min(10, matchedCount * 2);
        }

        // 매칭되지 않은 기능 수에 따른 페널티
        if (unmatchedCount > 0) {
            confidence -= Math.min(15, unmatchedCount * 3);
        }

        return Math.max(0, Math.min(100, confidence));
    }

    private estimateServerCost(server: MCPServer): number {
        // 서버 비용 추정 로직
        return 100; // 기본 비용
    }

    private estimateServerPerformance(server: MCPServer): number {
        // 서버 성능 추정 로직
        return 85; // 기본 성능 점수
    }
}

export default MCPServerMatchingEngine;
