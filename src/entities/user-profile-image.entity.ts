import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_profile_images' })
export class UserProfileImage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({ type: 'bigint', unsigned: true, unique: true })
  user_id: number = 0;

  @OneToOne(() => User, (user) => user.profileImage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 255 })
  file_name: string = '';

  @Column({ type: 'varchar', length: 100 })
  mime_type: string = '';

  @Column({ type: 'longblob' })
  image_data: Buffer = Buffer.alloc(0);

  @Column({ type: 'int', unsigned: true })
  file_size: number = 0;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date = new Date();

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date = new Date();
}
