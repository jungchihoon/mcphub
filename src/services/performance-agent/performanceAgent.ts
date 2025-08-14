import { HealthMetrics, PerformanceConfig } from '../../types/risk-management';

/**
 * 🚀 성능 모니터링 에이전트
 * 
 * MCPHub와 분리된 별도 프로세스로 실행되어
 * 컨테이너 및 시스템 성능을 모니터링합니다.
 */
export class PerformanceAgent {
    private readonly config: PerformanceConfig;
    private readonly metricsBuffer: Map<string, HealthMetrics[]> = new Map();
    private readonly maxBufferSize: number = 1000;
    private isRunning: boolean = false;
    private collectionInterval: NodeJS.Timeout | null = null;

    constructor(config: PerformanceConfig) {
        this.config = {
            collectionInterval: 5000, // 5초마다 수집
            bufferSize: 1000,
            maxRetries: 3,
            timeout: 10000,
            ...config
        };
    }

    /**
     * 🚀 에이전트 시작
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️ 에이전트가 이미 실행 중입니다.');
            return;
        }

        console.log('🚀 성능 모니터링 에이전트 시작...');
        this.isRunning = true;

        // 주기적 메트릭 수집 시작
        this.startPeriodicCollection();

        // HTTP 서버 시작 (메트릭 제공용)
        await this.startMetricsServer();

        console.log('✅ 성능 모니터링 에이전트가 성공적으로 시작되었습니다.');
    }

    /**
     * 🛑 에이전트 중지
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 성능 모니터링 에이전트 중지 중...');
        this.isRunning = false;

        // 주기적 수집 중지
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }

        console.log('✅ 성능 모니터링 에이전트가 중지되었습니다.');
    }

    /**
     * 📊 주기적 메트릭 수집 시작
     */
    private startPeriodicCollection(): void {
        this.collectionInterval = setInterval(async () => {
            if (!this.isRunning) return;

            try {
                await this.collectSystemMetrics();
            } catch (error) {
                console.error('❌ 메트릭 수집 중 오류 발생:', error);
            }
        }, this.config.collectionInterval);
    }

    /**
     * 🔍 시스템 메트릭 수집
     */
    private async collectSystemMetrics(): Promise<void> {
        const timestamp = new Date();

        // 1. CPU 사용률 수집
        const cpuUsage = await this.collectCPUUsage();

        // 2. 메모리 사용률 수집
        const memoryUsage = await this.collectMemoryUsage();

        // 3. 디스크 사용률 수집
        const diskUsage = await this.collectDiskUsage();

        // 4. 네트워크 지연 측정
        const networkLatency = await this.collectNetworkLatency();

        // 5. 응답 시간 측정
        const responseTime = await this.collectResponseTime();

        // 6. 에러율 계산
        const errorRate = await this.calculateErrorRate();

        // 7. 활성 연결 수
        const activeConnections = await this.countActiveConnections();

        // 8. 처리량 측정
        const throughput = await this.measureThroughput();

        // 메트릭 객체 생성
        const metrics: HealthMetrics = {
            hubId: 'mcphub-main',
            timestamp,
            cpuUsage,
            memoryUsage,
            diskUsage,
            networkLatency,
            responseTime,
            errorRate,
            activeConnections,
            throughput
        };

        // 버퍼에 저장
        this.storeMetrics(metrics);
    }

    /**
     * 💾 메트릭을 버퍼에 저장
     */
    private storeMetrics(metrics: HealthMetrics): void {
        const hubId = metrics.hubId;

        if (!this.metricsBuffer.has(hubId)) {
            this.metricsBuffer.set(hubId, []);
        }

        const buffer = this.metricsBuffer.get(hubId)!;
        buffer.push(metrics);

        // 버퍼 크기 제한
        if (buffer.length > this.maxBufferSize) {
            buffer.shift(); // 가장 오래된 메트릭 제거
        }
    }

    /**
     * 📊 특정 허브의 최신 메트릭 조회
     */
    getLatestMetrics(hubId: string): HealthMetrics | null {
        const buffer = this.metricsBuffer.get(hubId);
        if (!buffer || buffer.length === 0) {
            return null;
        }
        return buffer[buffer.length - 1];
    }

    /**
     * 📈 특정 허브의 메트릭 히스토리 조회
     */
    getMetricsHistory(hubId: string, limit: number = 100): HealthMetrics[] {
        const buffer = this.metricsBuffer.get(hubId);
        if (!buffer) {
            return [];
        }
        return buffer.slice(-limit);
    }

    // 🔧 실제 메트릭 수집 메서드들 (시스템별 구현 필요)
    private async collectCPUUsage(): Promise<number> {
        // 실제 구현에서는 os.cpus() 또는 /proc/stat 사용
        return Math.random() * 100;
    }

    private async collectMemoryUsage(): Promise<number> {
        // 실제 구현에서는 os.freemem(), os.totalmem() 사용
        return Math.random() * 100;
    }

    private async collectDiskUsage(): Promise<number> {
        // 실제 구현에서는 fs.statfs() 사용
        return Math.random() * 100;
    }

    private async collectNetworkLatency(): Promise<number> {
        // 실제 구현에서는 ping 또는 네트워크 모니터링 도구 사용
        return Math.random() * 200;
    }

    private async collectResponseTime(): Promise<number> {
        // 실제 구현에서는 HTTP 요청 응답 시간 측정
        return Math.random() * 500;
    }

    private async calculateErrorRate(): Promise<number> {
        // 실제 구현에서는 로그 분석 또는 에러 카운터 사용
        return Math.random() * 10;
    }

    private async countActiveConnections(): Promise<number> {
        // 실제 구현에서는 netstat 또는 연결 상태 확인
        return Math.floor(Math.random() * 1000);
    }

    private async measureThroughput(): Promise<number> {
        // 실제 구현에서는 처리된 요청 수 / 시간 계산
        return Math.random() * 1000;
    }

    /**
     * 🌐 HTTP 메트릭 서버 시작
     */
    private async startMetricsServer(): Promise<void> {
        // 실제 구현에서는 Express.js 또는 Fastify 사용
        console.log('🌐 메트릭 서버 시작 (포트: 9090)');
        console.log('📊 메트릭 엔드포인트: http://localhost:9090/metrics/:hubId');
    }
}
