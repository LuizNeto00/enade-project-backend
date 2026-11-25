import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from './question.entity';
import type { QuestionImageField } from '../interfaces/question/question-image-field.type';

@Entity({ name: 'question_images' })
export class QuestionImage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({
    type: 'bigint',
    unsigned: true,
    name: 'question_id',
    nullable: true,
  })
  question_id: number | null = null;

  @ManyToOne(() => Question, (question) => question.images, {
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'question_id' })
  question?: Question | null;

  @Column({ type: 'varchar', length: 30 })
  field: QuestionImageField = 'statement';

  @Column({ type: 'varchar', length: 1024 })
  path: string = '';

  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  mime_type: string = '';

  @Column({ type: 'int', unsigned: true })
  size: number = 0;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null = null;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string = '';

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  created_at: Date = new Date();
}
