import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MockExam } from './mock-exam.entity';
import { User } from './user.entity';

@Entity({ name: 'mock_exam_completions' })
@Unique('UQ_mock_exam_completions_exam_student', ['mock_exam_id', 'student_id'])
export class MockExamCompletion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({ type: 'bigint', unsigned: true })
  mock_exam_id: number = 0;

  @ManyToOne(() => MockExam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mock_exam_id' })
  mock_exam?: MockExam;

  @Column({ type: 'bigint', unsigned: true })
  student_id: number = 0;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: User;

  @CreateDateColumn({ type: 'datetime' })
  completed_at: Date = new Date();
}
