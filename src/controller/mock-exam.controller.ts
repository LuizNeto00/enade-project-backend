import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import { sendPdf } from '../helper/mock-exam/pdf-response.helper';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import type { MockExamFiles } from '../interfaces/mock-exam/mock-exam-files.interface';
import { CreateMockExamRequest } from '../request/mock-exam/create-mock-exam.request';
import { FilterMockExamsRequest } from '../request/mock-exam/filter-mock-exams.request';
import { UpdateMockExamRequest } from '../request/mock-exam/update-mock-exam.request';
import { MockExamService } from '../service/mock-exam.service';
import {
  PdfStorageService,
  getMaxPdfSize,
} from '../service/pdf-storage.service';

const pdfUpload = FileFieldsInterceptor(
  [
    { name: 'examPdf', maxCount: 1 },
    { name: 'answerKeyPdf', maxCount: 1 },
  ],
  {
    storage: memoryStorage(),
    limits: { fileSize: getMaxPdfSize(), files: 2 },
  },
);

@Controller('mock-exams')
@UseGuards(AuthTokenGuard)
export class MockExamController {
  constructor(
    private readonly service: MockExamService,
    private readonly storage: PdfStorageService,
  ) {}

  @Post()
  @UseInterceptors(pdfUpload)
  create(
    @Body() request: CreateMockExamRequest,
    @UploadedFiles() files: MockExamFiles | undefined,
    @Req() auth: AuthenticatedRequest,
  ) {
    return this.service.create(request, files ?? {}, auth.user);
  }

  @Get('teacher')
  list(
    @Query() filters: FilterMockExamsRequest,
    @Req() auth: AuthenticatedRequest,
  ) {
    return this.service.list(auth.user, filters);
  }

  @Get('teacher/upload-config')
  uploadConfig(@Req() auth: AuthenticatedRequest) {
    return this.service.uploadConfig(auth.user);
  }

  @Get('teacher/:id')
  details(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
  ) {
    return this.service.details(id, auth.user);
  }

  @Get('teacher/:id/exam')
  exam(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.document(id, auth, response, 'exam', false);
  }

  @Get('teacher/:id/exam/download')
  downloadExam(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.document(id, auth, response, 'exam', true);
  }

  @Get('teacher/:id/answer-key')
  answerKey(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.document(id, auth, response, 'answer-key', false);
  }

  @Get('teacher/:id/answer-key/download')
  downloadAnswerKey(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.document(id, auth, response, 'answer-key', true);
  }

  @Patch(':id')
  @UseInterceptors(pdfUpload)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateMockExamRequest,
    @UploadedFiles() files: MockExamFiles | undefined,
    @Req() auth: AuthenticatedRequest,
  ) {
    return this.service.update(id, request, files ?? {}, auth.user);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
  ) {
    await this.service.delete(id, auth.user);
  }

  private async document(
    id: number,
    auth: AuthenticatedRequest,
    response: Response,
    kind: 'exam' | 'answer-key',
    download: boolean,
  ) {
    const exam = await this.service.findOwned(id, auth.user);
    const path =
      kind === 'exam' ? exam.exam_pdf_path : exam.answer_key_pdf_path;
    const name =
      kind === 'exam' ? exam.exam_pdf_name : exam.answer_key_pdf_name;
    return sendPdf(this.storage, response, path, name, download);
  }
}
