import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionComment } from './question-comment.entity';

@Entity({ name: 'question_comment_images' })
export class QuestionCommentImage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number | string = 0;

  @Column({ type: 'bigint', unsigned: true })
  comment_id: number | string = 0;

  @ManyToOne(() => QuestionComment, (comment) => comment.images, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'comment_id' })
  comment?: QuestionComment;

  @Column({ type: 'varchar', length: 1024 })
  path: string = '';

  @Column({ type: 'varchar', length: 255 })
  original_name: string = '';

  @Column({ type: 'varchar', length: 100 })
  mime_type: string = '';

  @Column({ type: 'int', unsigned: true })
  size: number = 0;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date = new Date();
}
