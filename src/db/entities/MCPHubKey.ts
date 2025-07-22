import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

/**
 * MCPHub Key 엔티티
 * 사용자별 API 키 관리, 90일 유효기간 및 토큰 저장소 연결을 담당합니다.
 */
@Entity('mcphub_keys')
export class MCPHubKey {
  /**
   * MCPHub Key 고유 ID (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 실제 API 키 값 (mcphub_ prefix)
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  keyValue!: string;

  /**
   * 키 이름 (사용자가 지정)
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * 키 설명 (선택적)
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 소유자 사용자 ID
   */
  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * 소유자 사용자 (관계)
   */
  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user!: any;

  /**
   * 키 활성화 상태
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 키 만료일 (생성일로부터 90일)
   */
  @Column({ type: 'timestamp' })
  @Index()
  expiresAt!: Date;

  /**
   * 마지막 사용 시간
   */
  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  /**
   * 사용 횟수
   */
  @Column({ type: 'integer', default: 0 })
  usageCount!: number;

  /**
   * 연결된 서비스 토큰 (JSON 형태)
   * 예: {"GITHUB_TOKEN": "ghp_xxx", "FIRECRAWL_TOKEN": "fc_xxx"}
   */
  @Column({ type: 'jsonb', nullable: true })
  serviceTokens?: Record<string, string>;

  /**
   * 생성 시간
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정 시간
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * 키가 만료되었는지 확인
   */
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * 키가 유효한지 확인 (활성화 상태 + 미만료)
   */
  get isValid(): boolean {
    return this.isActive && !this.isExpired;
  }

  /**
   * 만료까지 남은 일수 계산
   */
  get daysUntilExpiry(): number {
    const now = new Date();
    const diffTime = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 