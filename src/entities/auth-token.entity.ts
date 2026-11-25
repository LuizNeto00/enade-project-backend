import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'personal_access_tokens' })
export class AuthToken {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'user_id' })
  user_id: number;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'token_hash' })
  token_hash: string;

  @Column({ type: 'datetime', nullable: true, name: 'last_used_at' })
  last_used_at: Date | null;

  @Column({ type: 'datetime', name: 'expires_at' })
  expires_at: Date;

  @Column({ type: 'datetime', nullable: true, name: 'revoked_at' })
  revoked_at: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.tokens, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
