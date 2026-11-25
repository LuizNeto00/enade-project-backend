import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { QuestionImage } from './question-image.entity';
import type {
  QuestionDifficulty,
  QuestionOptionLabel,
  QuestionStatus,
} from '../interfaces/question/question-types';

@Entity({ name: 'questions' })
export class Question {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({ type: 'bigint', unsigned: true })
  teacher_id: number = 0;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: User;

  @Column({ type: 'longtext' })
  statement: string = '';

  @Column({ type: 'varchar', length: 255 })
  course: string = '';

  @Column({ type: 'int', name: 'exam_year' })
  exam_year: number = 2004;

  @Column({ type: 'enum', enum: ['easy', 'medium', 'hard'] })
  level: QuestionDifficulty = 'easy';

  @Column({ type: 'tinyint', name: 'option_count' })
  option_count: 4 | 5 = 4;

  @Column({ type: 'longtext', name: 'option_a' })
  option_a: string = '';

  @Column({ type: 'longtext', name: 'option_b' })
  option_b: string = '';

  @Column({ type: 'longtext', name: 'option_c' })
  option_c: string = '';

  @Column({ type: 'longtext', name: 'option_d' })
  option_d: string = '';

  @Column({ type: 'longtext', nullable: true, name: 'option_e' })
  option_e: string | null = null;

  @Column({ type: 'varchar', length: 1, name: 'correct_option' })
  correct_option: QuestionOptionLabel = 'A';

  @Column({ type: 'longtext', name: 'answer_comment' })
  answer_comment: string = '';

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: QuestionStatus = 'active';

  @OneToMany(() => QuestionImage, (image) => image.question)
  images?: QuestionImage[];

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date = new Date();

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updated_at: Date = new Date();
}
