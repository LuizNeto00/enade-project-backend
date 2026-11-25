import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MockExamController } from '../controller/mock-exam.controller';
import { StudentMockExamController } from '../controller/student-mock-exam.controller';
import { MockExam } from '../entities/mock-exam.entity';
import { MockExamCompletion } from '../entities/mock-exam-completion.entity';
import { MockExamRepository } from '../repository/mock-exam.repository';
import { MockExamCompletionRepository } from '../repository/mock-exam-completion.repository';
import { MockExamResource } from '../resources/mock-exam/mock-exam.resource';
import { MockExamService } from '../service/mock-exam.service';
import { PdfStorageService } from '../service/pdf-storage.service';
import { StudentMockExamService } from '../service/student-mock-exam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MockExam, MockExamCompletion]),
    AuthModule,
  ],
  controllers: [MockExamController, StudentMockExamController],
  providers: [
    MockExamRepository,
    MockExamCompletionRepository,
    MockExamResource,
    MockExamService,
    PdfStorageService,
    StudentMockExamService,
  ],
})
export class MockExamModule {}
