import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { CreateQuestionRequest } from '../request/question/create-question.request';
import { QuestionService } from '../service/question.service';
import { handleControllerError } from '../common/errors/handle-controller-error';
import { FilterQuestionsRequest } from '../request/question/filter-questions.request';

@Controller('question')
@UseGuards(AuthTokenGuard)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() request: CreateQuestionRequest,
    @UploadedFiles() files: any[],
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.questionService.create(
        request,
        (files ?? []) as Express.Multer.File[],
        authenticatedRequest.user,
      );
    } catch (error) {
      handleControllerError(error, 'QuestionController.create');
    }
  }

  @Get()
  async findAll(
    @Query() filters: FilterQuestionsRequest,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.questionService.findAllForTeacher(
        authenticatedRequest.user,
        filters,
      );
    } catch (error) {
      handleControllerError(error, 'QuestionController.findAll');
    }
  }

  @Get('teacher/:id/statistics')
  async getStatistics(
    @Param('id', ParseIntPipe) id: number,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.questionService.getStatistics(
        id,
        authenticatedRequest.user,
      );
    } catch (error) {
      handleControllerError(error, 'QuestionController.getStatistics');
    }
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: CreateQuestionRequest,
    @UploadedFiles() files: any[],
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      return await this.questionService.update(
        id,
        request,
        (files ?? []) as Express.Multer.File[],
        authenticatedRequest.user,
      );
    } catch (error) {
      handleControllerError(error, 'QuestionController.update');
    }
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ) {
    try {
      await this.questionService.delete(id, authenticatedRequest.user);
      return { message: 'Questão removida com sucesso.' };
    } catch (error) {
      handleControllerError(error, 'QuestionController.delete');
    }
  }
}
