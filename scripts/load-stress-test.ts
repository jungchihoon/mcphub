#!/usr/bin/env ts-node

/**
 * MCPHub v3.0 부하 테스트 및 스트레스 테스트 스크립트
 * 
 * 🎯 목표: 시스템의 부하 처리 능력과 한계점 파악
 * 📊 테스트 유형: 부하 테스트, 스트레스 테스트, 스파이크 테스트
 * 🚀 최적화: 성능 병목 지점 식별 및 개선 방안 도출
 */

import { performance } from 'perf_hooks';

interface LoadTestResult {
    testType: string;
    concurrentUsers: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTime: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    throughput: number; // req/s
    errorRate: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
}

interface StressTestResult {
    testType: string;
    maxConcurrentUsers: number;
    breakingPoint: number;
    recoveryTime: number;
    systemStability: 'stable' | 'degraded' | 'failed';
    recommendations: string[];
}

class MCPHubLoadStressTest {
    private loadTestResults: LoadTestResult[] = [];
    private stressTestResults: StressTestResult[] = [];
    private isRunning: boolean = false;

    constructor() {
        console.log('🚀 MCPHub v3.0 부하 테스트 및 스트레스 테스트 시작');
        console.log('='.repeat(70));
    }

    /**
     * 메모리 사용량을 읽기 쉬운 형태로 변환
     */
    private formatBytes(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 모의 API 요청 처리 (실제로는 실제 API 호출)
     */
    private async simulateAPIRequest(delay: number = 10): Promise<void> {
        // 실제 API 호출을 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 20));

        // 가끔 실패 시뮬레이션 (5% 확률)
        if (Math.random() < 0.05) {
            throw new Error('API 요청 실패');
        }
    }

    /**
     * 모의 MCP 서버 매칭 (AI Auto-Configuration System)
     */
    private async simulateServerMatching(delay: number = 2.5): Promise<void> {
        // AI Auto-Configuration System의 2.48ms 목표 성능 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 1));
    }

    /**
     * 모의 데이터베이스 쿼리
     */
    private async simulateDatabaseQuery(delay: number = 25): Promise<void> {
        // 데이터베이스 쿼리 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 15));
    }

    /**
     * 부하 테스트 실행
     */
    async runLoadTest(
        concurrentUsers: number,
        totalRequests: number,
        testType: string = 'API'
    ): Promise<LoadTestResult> {
        console.log(`\n📊 ${testType} 부하 테스트 시작`);
        console.log(`   동시 사용자: ${concurrentUsers}명`);
        console.log(`   총 요청 수: ${totalRequests}개`);

        const startTime = performance.now();
        const startMemory = process.memoryUsage();
        const startCpu = process.cpuUsage();

        const responseTimes: number[] = [];
        let successfulRequests = 0;
        let failedRequests = 0;

        // 동시 요청 처리
        const userPromises = Array(concurrentUsers).fill(0).map(async (_, userIndex) => {
            const requestsPerUser = Math.ceil(totalRequests / concurrentUsers);

            for (let i = 0; i < requestsPerUser; i++) {
                try {
                    const requestStart = performance.now();

                    // 테스트 유형에 따른 요청 처리
                    switch (testType) {
                        case 'API':
                            await this.simulateAPIRequest();
                            break;
                        case 'MCP_MATCHING':
                            await this.simulateServerMatching();
                            break;
                        case 'DATABASE':
                            await this.simulateDatabaseQuery();
                            break;
                        default:
                            await this.simulateAPIRequest();
                    }

                    const requestEnd = performance.now();
                    responseTimes.push(requestEnd - requestStart);
                    successfulRequests++;

                } catch (error) {
                    failedRequests++;
                }
            }
        });

        // 모든 사용자의 요청 완료 대기
        await Promise.all(userPromises);

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage();

        const totalTime = endTime - startTime;
        const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);
        const throughput = (successfulRequests / totalTime) * 1000; // req/s
        const errorRate = (failedRequests / totalRequests) * 100;
        const cpuUsage = (endCpu.user + endCpu.system) / 1000000; // 초 단위

        const result: LoadTestResult = {
            testType,
            concurrentUsers,
            totalRequests,
            successfulRequests,
            failedRequests,
            totalTime,
            averageResponseTime,
            minResponseTime,
            maxResponseTime,
            throughput,
            errorRate,
            memoryUsage: endMemory,
            cpuUsage
        };

        this.loadTestResults.push(result);

        console.log(`✅ ${testType} 부하 테스트 완료:`);
        console.log(`   평균 응답 시간: ${averageResponseTime.toFixed(2)}ms`);
        console.log(`   처리량: ${throughput.toFixed(2)} req/s`);
        console.log(`   성공률: ${((successfulRequests / totalRequests) * 100).toFixed(1)}%`);
        console.log(`   에러율: ${errorRate.toFixed(2)}%`);
        console.log(`   메모리 사용량: ${this.formatBytes(endMemory.heapUsed)}`);

        return result;
    }

    /**
     * 스트레스 테스트 실행
     */
    async runStressTest(
        startUsers: number = 10,
        maxUsers: number = 1000,
        stepSize: number = 10,
        requestsPerUser: number = 100
    ): Promise<StressTestResult> {
        console.log(`\n🔥 스트레스 테스트 시작`);
        console.log(`   시작 사용자: ${startUsers}명`);
        console.log(`   최대 사용자: ${maxUsers}명`);
        console.log(`   단계별 증가: ${stepSize}명`);

        let currentUsers = startUsers;
        let breakingPoint = startUsers;
        let systemStability: 'stable' | 'degraded' | 'failed' = 'stable';
        const recommendations: string[] = [];

        while (currentUsers <= maxUsers && systemStability !== 'failed') {
            console.log(`\n📊 ${currentUsers}명 동시 사용자 테스트 중...`);

            try {
                const result = await this.runLoadTest(
                    currentUsers,
                    currentUsers * requestsPerUser,
                    'API'
                );

                // 시스템 안정성 평가
                if (result.errorRate > 10) {
                    systemStability = 'failed';
                    breakingPoint = currentUsers;
                    recommendations.push(`동시 사용자 ${currentUsers}명에서 시스템 실패 (에러율: ${result.errorRate.toFixed(1)}%)`);
                    break;
                } else if (result.errorRate > 5) {
                    systemStability = 'degraded';
                    breakingPoint = currentUsers;
                    recommendations.push(`동시 사용자 ${currentUsers}명에서 성능 저하 (에러율: ${result.errorRate.toFixed(1)}%)`);
                } else if (result.averageResponseTime > 1000) {
                    systemStability = 'degraded';
                    breakingPoint = currentUsers;
                    recommendations.push(`동시 사용자 ${currentUsers}명에서 응답 시간 지연 (평균: ${result.averageResponseTime.toFixed(0)}ms)`);
                }

                currentUsers += stepSize;

                // 안정성을 위한 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                systemStability = 'failed';
                breakingPoint = currentUsers;
                recommendations.push(`동시 사용자 ${currentUsers}명에서 시스템 크래시 발생`);
                break;
            }
        }

        const recoveryTime = await this.testRecovery(breakingPoint);

        const stressResult: StressTestResult = {
            testType: 'STRESS_TEST',
            maxConcurrentUsers: breakingPoint,
            breakingPoint,
            recoveryTime,
            systemStability,
            recommendations
        };

        this.stressTestResults.push(stressResult);

        console.log(`\n🔥 스트레스 테스트 완료:`);
        console.log(`   한계점: ${breakingPoint}명 동시 사용자`);
        console.log(`   시스템 안정성: ${systemStability}`);
        console.log(`   복구 시간: ${recoveryTime.toFixed(2)}초`);

        return stressResult;
    }

    /**
     * 시스템 복구 능력 테스트
     */
    private async testRecovery(breakingPoint: number): Promise<number> {
        console.log(`\n🔄 시스템 복구 능력 테스트 중...`);

        const startTime = performance.now();

        // 안정적인 사용자 수로 테스트
        const stableUsers = Math.floor(breakingPoint * 0.5);

        try {
            await this.runLoadTest(stableUsers, stableUsers * 10, 'API');

            const endTime = performance.now();
            const recoveryTime = (endTime - startTime) / 1000;

            console.log(`✅ 시스템 복구 완료: ${recoveryTime.toFixed(2)}초`);
            return recoveryTime;

        } catch (error) {
            console.log(`❌ 시스템 복구 실패`);
            return -1;
        }
    }

    /**
     * 스파이크 테스트 실행
     */
    async runSpikeTest(
        baseUsers: number = 50,
        spikeUsers: number = 200,
        spikeDuration: number = 30 // 초
    ): Promise<void> {
        console.log(`\n⚡ 스파이크 테스트 시작`);
        console.log(`   기본 사용자: ${baseUsers}명`);
        console.log(`   스파이크 사용자: ${spikeUsers}명`);
        console.log(`   스파이크 지속시간: ${spikeDuration}초`);

        // 1단계: 기본 부하
        console.log(`\n📊 1단계: 기본 부하 (${baseUsers}명)`);
        await this.runLoadTest(baseUsers, baseUsers * 50, 'API');

        // 2단계: 갑작스러운 부하 증가
        console.log(`\n📊 2단계: 스파이크 부하 (${spikeUsers}명)`);
        const spikeStart = performance.now();
        await this.runLoadTest(spikeUsers, spikeUsers * 20, 'API');
        const spikeEnd = performance.now();

        const actualSpikeDuration = (spikeEnd - spikeStart) / 1000;
        console.log(`   실제 스파이크 지속시간: ${actualSpikeDuration.toFixed(2)}초`);

        // 3단계: 부하 감소 및 복구
        console.log(`\n📊 3단계: 부하 감소 및 복구 (${baseUsers}명)`);
        await this.runLoadTest(baseUsers, baseUsers * 30, 'API');

        console.log(`✅ 스파이크 테스트 완료`);
    }

    /**
     * 전체 테스트 실행
     */
    async runAllTests(): Promise<void> {
        try {
            // 1. 부하 테스트
            console.log('\n🚀 1단계: 부하 테스트 실행');
            await this.runLoadTest(10, 1000, 'API');
            await this.runLoadTest(25, 2500, 'API');
            await this.runLoadTest(50, 5000, 'API');

            await this.runLoadTest(10, 1000, 'MCP_MATCHING');
            await this.runLoadTest(25, 2500, 'MCP_MATCHING');

            await this.runLoadTest(10, 1000, 'DATABASE');
            await this.runLoadTest(25, 2500, 'DATABASE');

            // 2. 스트레스 테스트
            console.log('\n🔥 2단계: 스트레스 테스트 실행');
            await this.runStressTest(10, 500, 25, 50);

            // 3. 스파이크 테스트
            console.log('\n⚡ 3단계: 스파이크 테스트 실행');
            await this.runSpikeTest(30, 150, 20);

        } catch (error) {
            console.error('❌ 테스트 실행 중 오류 발생:', error);
        }

        this.generateComprehensiveReport();
    }

    /**
     * 종합 테스트 보고서 생성
     */
    private generateComprehensiveReport(): void {
        console.log('\n' + '='.repeat(70));
        console.log('📊 MCPHub v3.0 부하 테스트 및 스트레스 테스트 종합 보고서');
        console.log('='.repeat(70));

        // 부하 테스트 결과 요약
        console.log('\n🚀 부하 테스트 결과 요약:');
        this.loadTestResults.forEach(result => {
            console.log(`\n${result.testType} (${result.concurrentUsers}명 동시):`);
            console.log(`  📊 평균 응답 시간: ${result.averageResponseTime.toFixed(2)}ms`);
            console.log(`  ⚡ 처리량: ${result.throughput.toFixed(2)} req/s`);
            console.log(`  ✅ 성공률: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`);
            console.log(`  🚨 에러율: ${result.errorRate.toFixed(2)}%`);
        });

        // 스트레스 테스트 결과 요약
        console.log('\n🔥 스트레스 테스트 결과 요약:');
        this.stressTestResults.forEach(result => {
            console.log(`\n${result.testType}:`);
            console.log(`  🎯 한계점: ${result.maxConcurrentUsers}명 동시 사용자`);
            console.log(`  🛡️  시스템 안정성: ${result.systemStability}`);
            console.log(`  🔄 복구 시간: ${result.recoveryTime.toFixed(2)}초`);
        });

        // 성능 개선점 도출
        console.log('\n💡 성능 개선점 도출:');

        // 응답 시간 개선점
        const slowTests = this.loadTestResults.filter(r => r.averageResponseTime > 100);
        if (slowTests.length > 0) {
            console.log(`\n🔧 응답 시간 개선 필요:`);
            slowTests.forEach(test => {
                console.log(`  - ${test.testType}: ${test.averageResponseTime.toFixed(0)}ms → 100ms 이하 목표`);
            });
        }

        // 에러율 개선점
        const highErrorTests = this.loadTestResults.filter(r => r.errorRate > 1);
        if (highErrorTests.length > 0) {
            console.log(`\n🚨 에러율 개선 필요:`);
            highErrorTests.forEach(test => {
                console.log(`  - ${test.testType}: ${test.errorRate.toFixed(1)}% → 1% 이하 목표`);
            });
        }

        // 처리량 개선점
        const lowThroughputTests = this.loadTestResults.filter(r => r.throughput < 100);
        if (lowThroughputTests.length > 0) {
            console.log(`\n⚡ 처리량 개선 필요:`);
            lowThroughputTests.forEach(test => {
                console.log(`  - ${test.testType}: ${test.throughput.toFixed(0)} req/s → 100 req/s 이상 목표`);
            });
        }

        // 시스템 안정성 권장사항
        console.log('\n🛡️ 시스템 안정성 권장사항:');
        this.stressTestResults.forEach(result => {
            if (result.recommendations.length > 0) {
                console.log(`\n${result.testType}:`);
                result.recommendations.forEach(rec => {
                    console.log(`  - ${rec}`);
                });
            }
        });

        console.log('\n🎉 모든 테스트 완료!');
    }
}

// 메인 실행
async function main() {
    const loadStressTest = new MCPHubLoadStressTest();
    await loadStressTest.runAllTests();
}

// ESM 모듈에서 직접 실행
main().catch(console.error);

export { MCPHubLoadStressTest };
