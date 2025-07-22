import { AppDataSource } from '../db/connection.js';
import { User } from '../db/entities/User.js';
import { MCPHubKey } from '../db/entities/MCPHubKey.js';
import { UserRepository } from '../db/repositories/UserRepository.js';
import { MCPHubKeyRepository } from '../db/repositories/MCPHubKeyRepository.js';

/**
 * 사용자 Service
 * GitHub OAuth 기반 사용자 관리 및 MCPHub Key 연동 비즈니스 로직을 담당합니다.
 */
export class UserService {
  private userRepository: UserRepository;
  private mcpHubKeyRepository: MCPHubKeyRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.mcpHubKeyRepository = new MCPHubKeyRepository();
  }

  /**
   * GitHub OAuth 프로필로 사용자 로그인 처리
   */
  async handleGithubLogin(githubProfile: {
    id: string;
    username: string;
    displayName?: string;
    email?: string;
    avatar_url?: string;
    html_url?: string;
  }): Promise<{
    user: User;
    isNewUser: boolean;
  }> {
    console.log(`🔐 GitHub 로그인 처리: ${githubProfile.username} (ID: ${githubProfile.id})`);

    // 기존 사용자 확인
    const existingUser = await this.userRepository.findByGithubId(githubProfile.id);
    const isNewUser = !existingUser;

    // 사용자 생성 또는 업데이트
    const user = await this.userRepository.createOrUpdateFromGithub({
      githubId: githubProfile.id,
      githubUsername: githubProfile.username,
      email: githubProfile.email,
      avatarUrl: githubProfile.avatar_url,
      displayName: githubProfile.displayName,
      githubProfileUrl: githubProfile.html_url
    });

    if (isNewUser) {
      console.log(`✨ 새 사용자 생성: ${user.githubUsername}`);
    } else {
      console.log(`🔄 기존 사용자 정보 업데이트: ${user.githubUsername}`);
    }

    return { user, isNewUser };
  }



  /**
   * 사용자 ID로 사용자 조회
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  /**
   * GitHub ID로 사용자 조회
   */
  async getUserByGithubId(githubId: string): Promise<User | null> {
    return this.userRepository.findByGithubId(githubId);
  }

  /**
   * GitHub 사용자명으로 조회
   */
  async getUserByGithubUsername(githubUsername: string): Promise<User | null> {
    return this.userRepository.findByGithubUsername(githubUsername);
  }

  /**
   * 사용자의 MCPHub Key 목록 조회
   */
  async getUserKeys(userId: string): Promise<MCPHubKey[]> {
    return this.mcpHubKeyRepository.findByUserId(userId);
  }

  /**
   * 사용자의 유효한 MCPHub Key 목록 조회
   */
  async getValidUserKeys(userId: string): Promise<MCPHubKey[]> {
    return this.mcpHubKeyRepository.findValidKeysByUserId(userId);
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateUserProfile(userId: string, updateData: {
    displayName?: string;
    email?: string;
  }): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    if (updateData.displayName !== undefined) {
      user.displayName = updateData.displayName;
    }
    if (updateData.email !== undefined) {
      user.email = updateData.email;
    }

    return this.userRepository.update(userId, user);
  }

  /**
   * 사용자 비활성화
   */
  async deactivateUser(userId: string): Promise<User | null> {
    console.log(`⚠️ 사용자 비활성화: ${userId}`);
    
    // 사용자의 모든 키도 비활성화
    const userKeys = await this.mcpHubKeyRepository.findByUserId(userId);
    await Promise.all(
      userKeys.map(key => this.mcpHubKeyRepository.setKeyActive(key.id, false))
    );

    return this.userRepository.deactivateUser(userId);
  }

  /**
   * 관리자 권한 설정
   */
  async setAdminRole(userId: string, isAdmin: boolean): Promise<User | null> {
    console.log(`👑 관리자 권한 ${isAdmin ? '부여' : '제거'}: ${userId}`);
    return this.userRepository.setAdminRole(userId, isAdmin);
  }

  /**
   * 모든 사용자 조회 (키 개수 포함)
   */
  async getAllUsersWithKeyCount(): Promise<User[]> {
    return this.userRepository.findAllWithKeyCount();
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    return this.userRepository.update(userId, updateData);
  }

  /**
   * 활성 사용자 목록 조회 (관리자용)
   */
  async getActiveUsers(limit: number = 50, offset: number = 0): Promise<{
    users: User[];
    total: number;
  }> {
    const [users, total] = await this.userRepository.findActiveUsers(limit, offset);
    return { users, total };
  }

  /**
   * 관리자 사용자 목록 조회
   */
  async getAdminUsers(): Promise<User[]> {
    return this.userRepository.findAdminUsers();
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    recentLoginUsers: number;
    newUsersThisMonth: number;
  }> {
    const baseStats = await this.userRepository.getUserStats();
    
    // 이번 달 신규 사용자 수 계산
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const newUsersThisMonth = await AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .where('user.createdAt >= :firstDayOfMonth', { firstDayOfMonth })
      .getCount();

    return {
      ...baseStats,
      newUsersThisMonth
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
    expiringKeysCount: number;
  }> {
    const baseStats = await this.mcpHubKeyRepository.getUserKeyUsageStats(userId);
    
    // 7일 내 만료 예정 키 수
    const userKeys = await this.mcpHubKeyRepository.findByUserId(userId);
    const expiringKeysCount = userKeys.filter(key => 
      key.isActive && key.daysUntilExpiry <= 7 && key.daysUntilExpiry > 0
    ).length;

    return {
      ...baseStats,
      expiringKeysCount
    };
  }

  /**
   * 사용자 검색 (관리자용)
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const repository = AppDataSource.getRepository(User);
    
    return repository.createQueryBuilder('user')
      .where('user.githubUsername ILIKE :query', { query: `%${query}%` })
      .orWhere('user.displayName ILIKE :query', { query: `%${query}%` })
      .orWhere('user.email ILIKE :query', { query: `%${query}%` })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .orderBy('user.lastLoginAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * 만료 임박 사용자 알림 대상 조회
   */
  async getUsersWithExpiringKeys(days: number = 7): Promise<{
    userId: string;
    user: User;
    expiringKeys: MCPHubKey[];
  }[]> {
    const expiringKeys = await this.mcpHubKeyRepository.findKeysExpiringWithin(days);
    
    // 사용자별로 그룹화
    const userKeyMap = new Map<string, MCPHubKey[]>();
    expiringKeys.forEach(key => {
      if (!userKeyMap.has(key.userId)) {
        userKeyMap.set(key.userId, []);
      }
      userKeyMap.get(key.userId)!.push(key);
    });

    // 사용자 정보와 함께 반환
    const result = [];
    for (const [userId, keys] of userKeyMap) {
      const user = await this.userRepository.findById(userId);
      if (user) {
        result.push({ userId, user, expiringKeys: keys });
      }
    }

    return result;
  }
} 