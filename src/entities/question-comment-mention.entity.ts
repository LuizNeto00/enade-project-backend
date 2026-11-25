import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuestionComment } from './question-comment.entity';
import { User } from './user.entity';

@Entity({ name: 'question_comment_mentions' })
@Unique('UQ_comment_mentions', ['comment_id', 'mentioned_user_id'])
export class QuestionCommentMention {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number = 0;

  @Column({ type: 'bigint', unsigned: true })
  comment_id: number | string = 0;

  @ManyToOne(() => QuestionComment, (comment) => comment.mentions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'comment_id' })
  comment?: QuestionComment;

  @Column({ type: 'bigint', unsigned: true })
  mentioned_user_id: number | string = 0;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentioned_user_id' })
  mentionedUser?: User;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date = new Date();
}
