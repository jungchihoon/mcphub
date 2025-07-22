import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';

/**
 * 사용자 엔티티
 * GitHub OAuth를 통한 사용자 정보와 MCPHub Key 연결을 관리합니다.
 */
@Entity('users')
export class User {
  /**
   * 사용자 고유 ID (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * GitHub 사용자 ID (고유)
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  githubId!: string;

  /**
   * GitHub 사용자명 (고유)
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  githubUsername!: string;

  /**
   * 이메일 주소 (GitHub에서 제공)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  /**
   * GitHub 아바타 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  /**
   * GitHub 표시 이름
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  displayName?: string;

  /**
   * GitHub 프로필 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  githubProfileUrl?: string;

  /**
   * 관리자 권한 여부
   */
  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  /**
   * 계정 활성화 상태
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 마지막 로그인 시간
   */
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

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
   * 사용자의 MCPHub Key들 (관계)
   */
  @OneToMany('MCPHubKey', 'user')
  mcpHubKeys?: any[];
} 