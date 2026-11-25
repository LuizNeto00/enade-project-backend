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

@Entity({ name: 'mock_exams' })
export class MockExam {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({ type: 'bigint', unsigned: true })
  teacher_id: number = 0;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: User;

  @Column({ type: 'varchar', length: 255 })
  title: string = '';

  @Column({ type: 'varchar', length: 255 })
  course: string = '';

  @Column({ type: 'int' })
  exam_year: number = 0;

  @Column({ type: 'varchar', length: 1024 })
  exam_pdf_path: string = '';

  @Column({ type: 'varchar', length: 1024 })
  answer_key_pdf_path: string = '';

  @Column({ type: 'varchar', length: 255 })
  exam_pdf_name: string = '';

  @Column({ type: 'varchar', length: 255 })
  answer_key_pdf_name: string = '';

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive' = 'active';

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date = new Date();

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date = new Date();
}
