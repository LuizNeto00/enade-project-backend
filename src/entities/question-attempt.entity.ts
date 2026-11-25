import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity';
import { User } from './user.entity';
import type { QuestionOptionLabel } from '../interfaces/question/question-types';

@Entity({ name: 'question_attempts' })
export class QuestionAttempt {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    name: 'question_id',
  })
  question_id: number | null = null;

  @ManyToOne(() => Question, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'question_id' })
  question?: Question;

  @Column({ type: 'bigint', unsigned: true, name: 'student_id' })
  student_id: number = 0;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'student_id' })
  student?: User;

  @Column({ type: 'varchar', length: 1, name: 'selected_option' })
  selected_option: QuestionOptionLabel = 'A';

  @Column({ type: 'tinyint', name: 'is_correct' })
  is_correct: boolean = false;

  @CreateDateColumn({ type: 'datetime', name: 'answered_at' })
  answered_at: Date = new Date();

  @Column({ type: 'varchar', length: 1, name: 'correct_option' })
  correct_option: QuestionOptionLabel = 'A';

  @Column({ type: 'longtext', nullable: true, name: 'question_snapshot' })
  question_snapshot: string | null = null;
}
