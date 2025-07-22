import { Repository, MoreThan, LessThan } from 'typeorm';
import { MCPHubKey } from '../entities/MCPHubKey.js';
import { BaseRepository } from './BaseRepository.js';
import crypto from 'crypto';

/**
 * MCPHub Key Repository
 * API 키 생성, 관리, 만료 처리 및 토큰 저장을 담당합니다.
 */
export class MCPHubKeyRepository extends BaseRepository<MCPHubKey> {
  
  constructor() {
    super(MCPHubKey);
  }

  /**
   * 키 값으로 MCPHub Key 조회
   */
  async findByKeyValue(keyValue: string): Promise<MCPHubKey | null> {
    return this.repository.findOne({
      where: { keyValue },
      relations: ['user']
    });
  }

  /**
   * 사용자 ID로 키 목록 조회
   */
  async findByUserId(userId: string): Promise<MCPHubKey[]> {
    return this.repository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * 유효한 키만 조회 (활성화 + 미만료)
   */
  async findValidKeysByUserId(userId: string): Promise<MCPHubKey[]> {
    const now = new Date();
    return this.repository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: MoreThan(now)
      },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * MCPHub Key 생성
   */
  async createKey(data: {
    userId: string;
    name: string;
    description?: string;
    serviceTokens?: Record<string, string>;
    expirationDays?: number;
  }): Promise<MCPHubKey> {
    // 지정된 일수 후 만료 설정 (기본값: 90일)
    const expirationDays = data.expirationDays || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // 고유한 키 값 생성 (mcphub_ prefix)
    const keyValue = this.generateKeyValue();

    const key = this.repository.create({
      keyValue,
      name: data.name,
      description: data.description,
      userId: data.userId,
      expiresAt,
      serviceTokens: data.serviceTokens || {},
      isActive: true,
      usageCount: 0
    });

    return this.repository.save(key);
  }

  /**
   * 고유한 키 값 생성
   */
  private generateKeyValue(): string {
    const randomBytes = crypto.randomBytes(32);
    const keyValue = `mcphub_${randomBytes.toString('hex')}`;
    return keyValue;
  }

  /**
   * 키 사용 기록 업데이트
   */
  async recordUsage(keyId: string): Promise<MCPHubKey | null> {
    const key = await this.findById(keyId);
    if (!key) return null;

    key.lastUsedAt = new Date();
    key.usageCount += 1;

    return this.repository.save(key);
  }

  /**
   * 키의 서비스 토큰 업데이트
   */
  async updateServiceTokens(keyId: string, serviceTokens: Record<string, string>): Promise<MCPHubKey | null> {
    const key = await this.findById(keyId);
    if (!key) return null;

    key.serviceTokens = { ...key.serviceTokens, ...serviceTokens };
    return this.repository.save(key);
  }

  /**
   * 키 활성화/비활성화
   */
  async setKeyActive(keyId: string, isActive: boolean): Promise<MCPHubKey | null> {
    const key = await this.findById(keyId);
    if (!key) return null;

    key.isActive = isActive;
    return this.repository.save(key);
  }

  /**
   * 키 만료 연장 (새로운 90일)
   */
  async extendExpiry(keyId: string): Promise<MCPHubKey | null> {
    const key = await this.findById(keyId);
    if (!key) return null;

    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + 90);
    
    key.expiresAt = newExpiryDate;
    return this.repository.save(key);
  }

  /**
   * 만료된 키 목록 조회
   */
  async findExpiredKeys(): Promise<MCPHubKey[]> {
    const now = new Date();
    return this.repository.find({
      where: {
        expiresAt: LessThan(now),
        isActive: true
      },
      relations: ['user']
    });
  }

  /**
   * 곧 만료될 키 목록 조회 (지정된 일수 이내)
   */
  async findKeysExpiringWithin(days: number): Promise<MCPHubKey[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.repository.find({
      where: {
        expiresAt: LessThan(futureDate),
        isActive: true
      },
      relations: ['user'],
      order: { expiresAt: 'ASC' }
    });
  }

  /**
   * 만료된 키 자동 비활성화
   */
  async deactivateExpiredKeys(): Promise<number> {
    const expiredKeys = await this.findExpiredKeys();
    
    if (expiredKeys.length === 0) return 0;

    await this.repository.update(
      { id: expiredKeys.map(key => key.id) as any },
      { isActive: false }
    );

    return expiredKeys.length;
  }

  /**
   * MCPHub Key 통계 조회
   */
  async getKeyStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    keysExpiringIn7Days: number;
    keysExpiringIn30Days: number;
  }> {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const [
      totalKeys,
      activeKeys,
      expiredKeys,
      keysExpiringIn7Days,
      keysExpiringIn30Days
    ] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { isActive: true, expiresAt: MoreThan(now) } }),
      this.repository.count({ where: { expiresAt: LessThan(now) } }),
      this.repository.count({ 
        where: { 
          isActive: true, 
          expiresAt: LessThan(sevenDaysLater) 
        } 
      }),
      this.repository.count({ 
        where: { 
          isActive: true, 
          expiresAt: LessThan(thirtyDaysLater) 
        } 
      })
    ]);

    return {
      totalKeys,
      activeKeys,
      expiredKeys,
      keysExpiringIn7Days,
      keysExpiringIn30Days
    };
  }

  /**
   * 사용자별 키 사용량 통계
   */
  async getUserKeyUsageStats(userId: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalUsage: number;
    lastUsed?: Date;
  }> {
    const keys = await this.findByUserId(userId);
    const activeKeys = keys.filter(key => key.isValid);
    const totalUsage = keys.reduce((sum, key) => sum + key.usageCount, 0);
    const lastUsed = keys
      .filter(key => key.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))[0]?.lastUsedAt;

    return {
      totalKeys: keys.length,
      activeKeys: activeKeys.length,
      totalUsage,
      lastUsed
    };
  }
} 