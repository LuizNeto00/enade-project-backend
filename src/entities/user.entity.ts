import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthToken } from './auth-token.entity';
import { UserProfileImage } from './user-profile-image.entity';
import type { UserProfileType } from '../interfaces/auth/user-profile.type';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({ type: 'varchar', length: 255 })
  name: string = '';

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string = '';

  @Column({ type: 'enum', enum: ['teacher', 'student'] })
  type_profile: UserProfileType = 'student';

  @Column({ type: 'varchar', length: 255, nullable: true })
  course: string | null = null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  institution: string | null = null;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string = '';

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date = new Date();

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date = new Date();

  @OneToMany(() => AuthToken, (authToken) => authToken.user)
  tokens?: AuthToken[];

  @OneToOne(() => UserProfileImage, (image) => image.user)
  profileImage?: UserProfileImage;
}
