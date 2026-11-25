import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AuthToken } from './entities/auth-token.entity';
import { User } from './entities/user.entity';
import { Question } from './entities/question.entity';
import { QuestionImage } from './entities/question-image.entity';
import { QuestionAttempt } from './entities/question-attempt.entity';
import { MockExam } from './entities/mock-exam.entity';
import { MockExamCompletion } from './entities/mock-exam-completion.entity';
import { QuestionComment } from './entities/question-comment.entity';
import { QuestionCommentImage } from './entities/question-comment-image.entity';
import { QuestionCommentMention } from './entities/question-comment-mention.entity';
import { UserProfileImage } from './entities/user-profile-image.entity';
import { getDatabaseConfig } from './config/database.config';

export const AppDataSource = new DataSource({
  ...getDatabaseConfig(),
  entities: [
    User,
    UserProfileImage,
    AuthToken,
    Question,
    QuestionImage,
    QuestionAttempt,
    MockExam,
    MockExamCompletion,
    QuestionComment,
    QuestionCommentImage,
    QuestionCommentMention,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
