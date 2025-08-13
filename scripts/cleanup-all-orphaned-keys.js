/**
 * 모든 고아 키를 정리하는 스크립트
 */

const { Pool } = require('pg');
const fs = require('fs');

// mcp_settings.json에서 현재 사용 중인 환경변수 추출
const loadSettings = () => {
    try {
        const settingsPath = './mcp_settings.json';
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        return settings;
    } catch (error) {
        console.error('mcp_settings.json 로드 실패:', error);
        process.exit(1);
    }
};

// 환경변수 추출 함수 (간단한 버전)
const extractUserEnvVars = (serverConfig) => {
    const variables = new Set();

    // headers에서 ${VAR_NAME} 패턴 찾기
    if (serverConfig.headers) {
        Object.values(serverConfig.headers).forEach(value => {
            if (typeof value === 'string') {
                const matches = value.match(/\$\{([^}]+)\}/g);
                if (matches) {
                    matches.forEach(match => {
                        const varName = match.slice(2, -1); // ${VAR_NAME} -> VAR_NAME
                        variables.add(varName);
                    });
                }
            }
        });
    }

    // env 필드에서 직접 정의된 환경변수
    if (serverConfig.env && typeof serverConfig.env === 'object') {
        Object.keys(serverConfig.env).forEach(key => {
            variables.add(key);
        });
    }

    return Array.from(variables);
};

// 현재 사용 중인 모든 환경변수 가져오기
const getCurrentEnvVars = (mcpSettings) => {
    const allEnvVars = new Set();

    if (mcpSettings?.mcpServers) {
        Object.values(mcpSettings.mcpServers).forEach((serverConfig) => {
            const serverEnvVars = extractUserEnvVars(serverConfig);
            serverEnvVars.forEach(varName => allEnvVars.add(varName));
        });
    }

    return Array.from(allEnvVars);
};

// 모든 고아 키 정리
const cleanupAllOrphanedKeys = async (dryRun = false) => {
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
        });

        // 현재 사용 중인 환경변수들 가져오기
        const settings = loadSettings();
        const currentEnvVars = getCurrentEnvVars(settings);

        console.log('📋 현재 사용 중인 환경변수:');
        console.log(`   ${currentEnvVars.join(', ')}`);
        console.log('');

        // 모든 활성 MCPHub 키에서 serviceTokens 조회
        const result = await pool.query(`
            SELECT 
                mk.id,
                mk."userId",
                mk."serviceTokens",
                u."githubUsername"
            FROM mcphub_keys mk
            JOIN users u ON mk."userId" = u.id
            WHERE mk."isActive" = true
            AND mk."serviceTokens" IS NOT NULL
        `);

        let affectedUsers = 0;
        const removedVars = new Set();
        const totalOrphanedKeys = 0;

        for (const row of result.rows) {
            const serviceTokens = row.serviceTokens || {};
            const currentKeys = Object.keys(serviceTokens);

            // 사용되지 않는 모든 키들 찾기 (USER_ 접두사 상관없이)
            const obsoleteKeys = currentKeys.filter(key => !currentEnvVars.includes(key));

            if (obsoleteKeys.length > 0) {
                console.log(`👤 사용자 ${row.githubUsername}: 제거 대상 키 ${obsoleteKeys.length}개`);
                console.log(`   제거 키: ${obsoleteKeys.join(', ')}`);

                if (!dryRun) {
                    // 불필요한 키들 제거
                    const cleanedTokens = { ...serviceTokens };
                    obsoleteKeys.forEach(key => {
                        delete cleanedTokens[key];
                        removedVars.add(key);
                    });

                    // DB 업데이트
                    await pool.query(`
                        UPDATE mcphub_keys 
                        SET "serviceTokens" = $1, "updatedAt" = NOW()
                        WHERE id = $2
                    `, [JSON.stringify(cleanedTokens), row.id]);

                    console.log(`   ✅ DB 업데이트 완료`);
                } else {
                    obsoleteKeys.forEach(key => removedVars.add(key));
                }

                affectedUsers++;
                totalOrphanedKeys += obsoleteKeys.length;
            }
        }

        await pool.end();

        const action = dryRun ? '분석 완료' : '정리 완료';
        console.log(`\n✅ 환경변수 ${action}: ${affectedUsers}명의 사용자, ${removedVars.size}개 변수 처리`);

        if (removedVars.size > 0) {
            console.log(`\n📊 제거된 변수 목록:`);
            Array.from(removedVars).forEach(key => console.log(`   - ${key}`));
        }

        if (dryRun) {
            console.log(`\n💡 실제 정리를 하려면 --dry-run 옵션을 제거하고 다시 실행하세요.`);
        }

    } catch (error) {
        console.error('❌ 환경변수 정리 실패:', error);
        process.exit(1);
    }
};

// 메인 실행
const main = async () => {
    const dryRun = process.argv.includes('--dry-run');
    const action = dryRun ? '시뮬레이션' : '실제 정리';

    console.log(`🧹 모든 고아 키 ${action}을 시작합니다...\n`);

    await cleanupAllOrphanedKeys(dryRun);
};

main();
