import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { AnswerStudentQuestionRequest } from '../request/question/answer-student-question.request';
import { FilterStudentQuestionsRequest } from '../request/question/filter-student-questions.request';
import { handleControllerError } from '../common/errors/handle-controller-error';
import { StudentQuestionService } from '../service/student-question.service';

@Controller('question/student')
@UseGuards(AuthTokenGuard)
export class StudentQuestionController {
  constructor(
    private readonly studentQuestionService: StudentQuestionService,
  ) {}

  @Get()
  async findAll(
    @Query() filters: FilterStudentQuestionsRequest,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.studentQuestionService.findAll(
        authenticatedRequest.user,
        filters,
      );
    } catch (error) {
      handleControllerError(error, 'StudentQuestionController.findAll');
    }
  }

  @Post(':id/answer')
  @HttpCode(HttpStatus.OK)
  async answer(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: AnswerStudentQuestionRequest,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.studentQuestionService.answer(
        id,
        request,
        authenticatedRequest.user,
      );
    } catch (error) {
      handleControllerError(error, 'StudentQuestionController.answer');
    }
  }
}
