import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';
import { User } from './user.entity';
import { QuestionCommentImage } from './question-comment-image.entity';
import { QuestionCommentMention } from './question-comment-mention.entity';

@Entity({ name: 'question_comments' })
export class QuestionComment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number | string = 0;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  question_id: number | string | null = null;

  @ManyToOne(() => Question, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  question?: Question | null;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number | string = 0;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  parent_id: number | string | null = null;

  @ManyToOne(() => QuestionComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: QuestionComment | null;

  @OneToMany(() => QuestionComment, (comment) => comment.parent)
  replies?: QuestionComment[];

  @Column({ type: 'text', nullable: true })
  content: string | null = null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date = new Date();

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date = new Date();

  @Column({ type: 'datetime', nullable: true })
  deleted_at: Date | null = null;

  @Column({ type: 'datetime', nullable: true })
  edited_at: Date | null = null;

  @OneToMany(() => QuestionCommentImage, (image) => image.comment)
  images?: QuestionCommentImage[];

  @OneToMany(() => QuestionCommentMention, (mention) => mention.comment)
  mentions?: QuestionCommentMention[];
}
