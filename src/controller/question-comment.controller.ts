import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  PipeTransform,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { CreateQuestionCommentRequest } from '../request/question-comment/create-question-comment.request';
import { UpdateQuestionCommentRequest } from '../request/question-comment/update-question-comment.request';
import { QuestionCommentService } from '../service/question-comment.service';
import { MAX_COMMENT_IMAGES } from '../service/question-comment-storage.service';
import type { Response } from 'express';

class CommentIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[0-9]+$/.test(value) || BigInt(value) === 0n) {
      throw new BadRequestException('Identificador inválido.');
    }
    return BigInt(value).toString();
  }
}

@Controller('question/:questionId/comments')
@UseGuards(AuthTokenGuard)
export class QuestionCommentController {
  constructor(private readonly service: QuestionCommentService) {}

  @Get()
  async list(
    @Param('questionId', CommentIdPipe) questionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.list(questionId, request.user);
  }

  @Get('mentions')
  async mentions(
    @Param('questionId', CommentIdPipe) questionId: string,
    @Query('search') search: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.searchMentionUsers(
      questionId,
      search ?? '',
      request.user,
    );
  }

  @Get('authors/:authorId/avatar')
  async getAuthorAvatar(
    @Param('questionId', CommentIdPipe) questionId: string,
    @Param('authorId', CommentIdPipe) authorId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.service.getAuthorAvatar(
      questionId,
      authorId,
      request.user,
    );
    response.set({
      'Content-Type': image.mime_type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(image.image_data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('images', MAX_COMMENT_IMAGES, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: MAX_COMMENT_IMAGES },
    }),
  )
  async create(
    @Param('questionId', CommentIdPipe) questionId: string,
    @Body() body: CreateQuestionCommentRequest,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: AuthenticatedRequest,
  ) {
    const mentionedUserIds = this.parseMentionIds(body.mentionedUserIds);
    return await this.service.create(
      questionId,
      { ...body, mentionedUserIds },
      files ?? [],
      request.user,
    );
  }

  @Patch(':commentId')
  @UseInterceptors(
    FilesInterceptor('images', MAX_COMMENT_IMAGES, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: MAX_COMMENT_IMAGES },
    }),
  )
  async update(
    @Param('questionId', CommentIdPipe) questionId: string,
    @Param('commentId', CommentIdPipe) commentId: string,
    @Body() body: UpdateQuestionCommentRequest,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.service.update(
      questionId,
      commentId,
      body,
      files ?? [],
      request.user,
    );
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('questionId', CommentIdPipe) questionId: string,
    @Param('commentId', CommentIdPipe) commentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.service.remove(questionId, commentId, request.user);
    return { message: 'Comentário removido.' };
  }

  private parseMentionIds(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
    }
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) return this.parseMentionIds(parsed);
      } catch {
        return [];
      }
    }
    return [];
  }
}
