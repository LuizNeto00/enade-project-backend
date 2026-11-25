import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import { sendPdf } from '../helper/mock-exam/pdf-response.helper';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { FilterStudentMockExamsRequest } from '../request/mock-exam/filter-student-mock-exams.request';
import { PdfStorageService } from '../service/pdf-storage.service';
import { StudentMockExamService } from '../service/student-mock-exam.service';

@Controller('mock-exams/student')
@UseGuards(AuthTokenGuard)
export class StudentMockExamController {
  constructor(
    private readonly service: StudentMockExamService,
    private readonly storage: PdfStorageService,
  ) {}

  @Get()
  list(
    @Query() filters: FilterStudentMockExamsRequest,
    @Req() auth: AuthenticatedRequest,
  ) {
    return this.service.list(auth.user, filters);
  }

  @Get(':id')
  details(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
  ) {
    return this.service.details(id, auth.user);
  }

  @Get(':id/exam')
  exam(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.document(id, auth, response, false);
  }

  @Get(':id/exam/download')
  download(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.document(id, auth, response, true);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
  ) {
    return this.service.complete(id, auth.user);
  }

  @Get(':id/answer-key')
  answerKey(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.keyDocument(id, auth, response, false);
  }

  @Get(':id/answer-key/download')
  downloadAnswerKey(
    @Param('id', ParseIntPipe) id: number,
    @Req() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.keyDocument(id, auth, response, true);
  }

  private async document(
    id: number,
    auth: AuthenticatedRequest,
    response: Response,
    download: boolean,
  ) {
    const exam = await this.service.findActive(id, auth.user);
    return sendPdf(
      this.storage,
      response,
      exam.exam_pdf_path,
      exam.exam_pdf_name,
      download,
    );
  }

  private async keyDocument(
    id: number,
    auth: AuthenticatedRequest,
    response: Response,
    download: boolean,
  ) {
    const exam = await this.service.findCompleted(id, auth.user);
    return sendPdf(
      this.storage,
      response,
      exam.answer_key_pdf_path,
      exam.answer_key_pdf_name,
      download,
    );
  }
}
