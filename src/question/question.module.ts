import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Question } from '../entities/question.entity';
import { QuestionController } from '../controller/question.controller';
import { QuestionRepository } from '../repository/question.repository';
import { QuestionService } from '../service/question.service';
import { ImageStorageService } from '../service/image-storage.service';
import { QuestionImageRepository } from '../repository/question-image.repository';
import { QuestionDataFactory } from '../factory/question/question-data.factory';
import { QuestionImage } from '../entities/question-image.entity';
import { QuestionResource } from '../resources/question/question.resource';
import { QuestionImageService } from '../service/question-image.service';
import { StudentQuestionController } from '../controller/student-question.controller';
import { StudentQuestionService } from '../service/student-question.service';
import { StudentQuestionResource } from '../resources/question/student-question.resource';
import { QuestionAttempt } from '../entities/question-attempt.entity';
import { QuestionAttemptRepository } from '../repository/question-attempt.repository';
import { QuestionStatisticsResource } from '../resources/question/question-statistics.resource';
import { StudentPerformanceController } from '../controller/student-performance.controller';
import { StudentPerformanceService } from '../service/student-performance.service';
import { StudentPerformanceRepository } from '../repository/student-performance.repository';
import { StudentPerformanceResource } from '../resources/student-performance/student-performance.resource';
import { QuestionComment } from '../entities/question-comment.entity';
import { QuestionCommentImage } from '../entities/question-comment-image.entity';
import { QuestionCommentMention } from '../entities/question-comment-mention.entity';
import { QuestionCommentController } from '../controller/question-comment.controller';
import { QuestionCommentRepository } from '../repository/question-comment.repository';
import { QuestionCommentService } from '../service/question-comment.service';
import { QuestionCommentResource } from '../resources/question/question-comment.resource';
import { QuestionCommentStorageService } from '../service/question-comment-storage.service';
import { TeacherDashboardController } from '../controller/teacher-dashboard.controller';
import { TeacherDashboardRepository } from '../repository/teacher-dashboard.repository';
import { TeacherDashboardService } from '../service/teacher-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      QuestionImage,
      QuestionAttempt,
      QuestionComment,
      QuestionCommentImage,
      QuestionCommentMention,
    ]),
    AuthModule,
  ],
  controllers: [
    QuestionController,
    StudentQuestionController,
    StudentPerformanceController,
    QuestionCommentController,
    TeacherDashboardController,
  ],
  providers: [
    QuestionRepository,
    QuestionImageRepository,
    QuestionService,
    ImageStorageService,
    QuestionDataFactory,
    QuestionResource,
    QuestionImageService,
    StudentQuestionService,
    StudentQuestionResource,
    QuestionAttemptRepository,
    QuestionStatisticsResource,
    StudentPerformanceService,
    StudentPerformanceRepository,
    StudentPerformanceResource,
    QuestionCommentRepository,
    QuestionCommentService,
    QuestionCommentResource,
    QuestionCommentStorageService,
    TeacherDashboardRepository,
    TeacherDashboardService,
  ],
  exports: [QuestionService],
})
export class QuestionModule {}
