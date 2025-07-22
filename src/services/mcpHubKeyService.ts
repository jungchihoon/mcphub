import { AppDataSource } from '../db/connection.js';
import { MCPHubKey } from '../db/entities/MCPHubKey.js';
import { User } from '../db/entities/User.js';
import { MCPHubKeyRepository } from '../db/repositories/MCPHubKeyRepository.js';
import { UserRepository } from '../db/repositories/UserRepository.js';

/**
 * MCPHub Key Service
 * API 키 생성, 관리, 토큰 저장, 만료 처리 등의 비즈니스 로직을 담당합니다.
 */
export class MCPHubKeyService {
  private mcpHubKeyRepository: MCPHubKeyRepository;
  private userRepository: UserRepository;

  constructor() {
    this.mcpHubKeyRepository = new MCPHubKeyRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * 새로운 MCPHub Key 생성
   */
  async createKey(userId: string, data: {
    name: string;
    description?: string;
    serviceTokens?: Record<string, string>;
    expirationDays?: number;
  }): Promise<MCPHubKey> {
    // 사용자 존재 여부 확인
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    if (!user.isActive) {
      throw new Error('비활성화된 사용자는 새 키를 생성할 수 없습니다.');
    }

    // 키 이름 중복 확인 (같은 사용자 내에서)
    const existingKeys = await this.mcpHubKeyRepository.findByUserId(userId);
    const nameExists = existingKeys.some(key => key.name === data.name && key.isActive);
    if (nameExists) {
      throw new Error('이미 존재하는 키 이름입니다.');
    }

    console.log(`🔑 새 MCPHub Key 생성: ${user.githubUsername} - ${data.name}`);
    
    const newKey = await this.mcpHubKeyRepository.createKey({
      userId,
      name: data.name,
      description: data.description,
      serviceTokens: data.serviceTokens || {},
      expirationDays: data.expirationDays || 90
    });

    console.log(`✅ MCPHub Key 생성 완료: ${newKey.keyValue.substring(0, 20)}... (만료: ${newKey.expiresAt.toLocaleDateString()})`);
    
    return newKey;
  }

  /**
   * 키 값으로 MCPHub Key 인증 및 조회
   */
  async authenticateKey(keyValue: string): Promise<{
    key: MCPHubKey;
    user: User;
    serviceTokens: Record<string, string>;
  } | null> {
    if (!keyValue.startsWith('mcphub_')) {
      return null;
    }

    const key = await this.mcpHubKeyRepository.findByKeyValue(keyValue);
    if (!key) {
      console.log(`❌ MCPHub Key 인증 실패: 키를 찾을 수 없음`);
      return null;
    }

    // 키 유효성 검사
    if (!key.isValid) {
      console.log(`❌ MCPHub Key 인증 실패: ${key.isExpired ? '만료됨' : '비활성화됨'}`);
      return null;
    }

    // 사용자 활성 상태 확인
    if (!key.user.isActive) {
      console.log(`❌ MCPHub Key 인증 실패: 사용자 비활성화됨`);
      return null;
    }

    // 키 사용 기록 업데이트 (비동기)
    this.mcpHubKeyRepository.recordUsage(key.id).catch(error => {
      console.error(`⚠️ 키 사용 기록 업데이트 실패:`, error);
    });

    console.log(`✅ MCPHub Key 인증 성공: ${key.user.githubUsername} - ${key.name}`);
    
    return {
      key,
      user: key.user,
      serviceTokens: key.serviceTokens || {}
    };
  }

  /**
   * 사용자의 키 목록 조회
   */
  async getUserKeys(userId: string): Promise<MCPHubKey[]> {
    return this.mcpHubKeyRepository.findByUserId(userId);
  }

  /**
   * 사용자의 유효한 키 목록 조회
   */
  async getValidUserKeys(userId: string): Promise<MCPHubKey[]> {
    return this.mcpHubKeyRepository.findValidKeysByUserId(userId);
  }

  /**
   * 키에 서비스 토큰 추가/업데이트
   */
  async updateServiceTokens(keyId: string, serviceTokens: Record<string, string>, userId?: string): Promise<MCPHubKey> {
    const key = await this.mcpHubKeyRepository.findById(keyId);
    if (!key) {
      throw new Error('키를 찾을 수 없습니다.');
    }

    // 소유자 확인 (userId가 제공된 경우)
    if (userId && key.userId !== userId) {
      throw new Error('키에 대한 권한이 없습니다.');
    }

    console.log(`🔗 서비스 토큰 업데이트: ${key.name} - ${Object.keys(serviceTokens).join(', ')}`);
    
    const updatedKey = await this.mcpHubKeyRepository.updateServiceTokens(keyId, serviceTokens);
    if (!updatedKey) {
      throw new Error('토큰 업데이트에 실패했습니다.');
    }

    return updatedKey;
  }

  /**
   * 키 활성화/비활성화
   */
  async setKeyActive(keyId: string, isActive: boolean, userId?: string): Promise<MCPHubKey> {
    const key = await this.mcpHubKeyRepository.findById(keyId);
    if (!key) {
      throw new Error('키를 찾을 수 없습니다.');
    }

    // 소유자 확인 (userId가 제공된 경우)
    if (userId && key.userId !== userId) {
      throw new Error('키에 대한 권한이 없습니다.');
    }

    console.log(`${isActive ? '🟢' : '🔴'} 키 ${isActive ? '활성화' : '비활성화'}: ${key.name}`);
    
    const updatedKey = await this.mcpHubKeyRepository.setKeyActive(keyId, isActive);
    if (!updatedKey) {
      throw new Error('키 상태 변경에 실패했습니다.');
    }

    return updatedKey;
  }

  /**
   * 키 만료 연장 (새로운 90일)
   */
  async extendKeyExpiry(keyId: string, userId?: string): Promise<MCPHubKey> {
    const key = await this.mcpHubKeyRepository.findById(keyId);
    if (!key) {
      throw new Error('키를 찾을 수 없습니다.');
    }

    // 소유자 확인 (userId가 제공된 경우)
    if (userId && key.userId !== userId) {
      throw new Error('키에 대한 권한이 없습니다.');
    }

    console.log(`📅 키 만료일 연장: ${key.name} - 새로운 90일`);
    
    const updatedKey = await this.mcpHubKeyRepository.extendExpiry(keyId);
    if (!updatedKey) {
      throw new Error('키 만료일 연장에 실패했습니다.');
    }

    console.log(`✅ 새로운 만료일: ${updatedKey.expiresAt.toLocaleDateString()}`);
    return updatedKey;
  }

  /**
   * 키 삭제 (소프트 삭제 - 비활성화)
   */
  async deleteKey(keyId: string, userId?: string): Promise<boolean> {
    const key = await this.mcpHubKeyRepository.findById(keyId);
    if (!key) {
      throw new Error('키를 찾을 수 없습니다.');
    }

    // 소유자 확인 (userId가 제공된 경우)
    if (userId && key.userId !== userId) {
      throw new Error('키에 대한 권한이 없습니다.');
    }

    console.log(`🗑️ 키 삭제: ${key.name}`);
    
    const deletedKey = await this.mcpHubKeyRepository.setKeyActive(keyId, false);
    return !!deletedKey;
  }

  /**
   * 만료된 키 자동 정리
   */
  async cleanupExpiredKeys(): Promise<{
    deactivatedCount: number;
    expiredKeys: MCPHubKey[];
  }> {
    console.log(`🧹 만료된 키 정리 작업 시작...`);
    
    const expiredKeys = await this.mcpHubKeyRepository.findExpiredKeys();
    const deactivatedCount = await this.mcpHubKeyRepository.deactivateExpiredKeys();

    if (deactivatedCount > 0) {
      console.log(`✅ ${deactivatedCount}개의 만료된 키를 비활성화했습니다.`);
    } else {
      console.log(`ℹ️ 정리할 만료된 키가 없습니다.`);
    }

    return { deactivatedCount, expiredKeys };
  }

  /**
   * 곧 만료될 키 알림 대상 조회
   */
  async getKeysExpiringWithin(days: number = 7): Promise<MCPHubKey[]> {
    return this.mcpHubKeyRepository.findKeysExpiringWithin(days);
  }

  /**
   * MCPHub Key 시스템 통계
   */
  async getKeySystemStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    keysExpiringIn7Days: number;
    keysExpiringIn30Days: number;
    topUsedKeys: {
      keyId: string;
      name: string;
      username: string;
      usageCount: number;
    }[];
  }> {
    const baseStats = await this.mcpHubKeyRepository.getKeyStats();
    
    // 최다 사용 키 TOP 5
    const repository = AppDataSource.getRepository(MCPHubKey);
    const topUsedKeysData = await repository
      .createQueryBuilder('key')
      .leftJoinAndSelect('key.user', 'user')
      .where('key.isActive = :isActive', { isActive: true })
      .orderBy('key.usageCount', 'DESC')
      .limit(5)
      .getMany();

    const topUsedKeys = topUsedKeysData.map(key => ({
      keyId: key.id,
      name: key.name,
      username: key.user.githubUsername,
      usageCount: key.usageCount
    }));

    return {
      ...baseStats,
      topUsedKeys
    };
  }

  /**
   * 특정 서비스 토큰이 설정된 키 목록 조회
   */
  async getKeysWithServiceToken(serviceName: string): Promise<MCPHubKey[]> {
    const repository = AppDataSource.getRepository(MCPHubKey);
    
    return repository
      .createQueryBuilder('key')
      .leftJoinAndSelect('key.user', 'user')
      .where('key.isActive = :isActive', { isActive: true })
      .andWhere('key.serviceTokens ? :serviceName', { serviceName })
      .getMany();
  }

  /**
   * 키 정보 업데이트 (이름, 설명)
   */
  async updateKeyInfo(keyId: string, updateData: {
    name?: string;
    description?: string;
  }, userId?: string): Promise<MCPHubKey> {
    const key = await this.mcpHubKeyRepository.findById(keyId);
    if (!key) {
      throw new Error('키를 찾을 수 없습니다.');
    }

    // 소유자 확인 (userId가 제공된 경우)
    if (userId && key.userId !== userId) {
      throw new Error('키에 대한 권한이 없습니다.');
    }

    // 키 이름 중복 확인 (변경하려는 경우)
    if (updateData.name && updateData.name !== key.name) {
      const existingKeys = await this.mcpHubKeyRepository.findByUserId(key.userId);
      const nameExists = existingKeys.some(k => 
        k.name === updateData.name && k.isActive && k.id !== keyId
      );
      if (nameExists) {
        throw new Error('이미 존재하는 키 이름입니다.');
      }
    }

    if (updateData.name !== undefined) {
      key.name = updateData.name;
    }
    if (updateData.description !== undefined) {
      key.description = updateData.description;
    }

    console.log(`📝 키 정보 업데이트: ${key.name}`);
    
    const updatedKey = await this.mcpHubKeyRepository.update(keyId, key);
    if (!updatedKey) {
      throw new Error('키 정보 업데이트에 실패했습니다.');
    }

    return updatedKey;
  }
} 