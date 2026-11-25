import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { QuestionModule } from './question/question.module';
import { MockExamModule } from './mock-exam/mock-exam.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
    QuestionModule,
    MockExamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
