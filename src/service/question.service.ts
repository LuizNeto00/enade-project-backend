import {
  ConflictException,
  ForbiddenException,
  Logger,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Question } from '../entities/question.entity';
import { CreateQuestionRequest } from '../request/question/create-question.request';
import { QuestionRepository } from '../repository/question.repository';
import { QuestionDataFactory } from '../factory/question/question-data.factory';
import { QuestionResource } from '../resources/question/question.resource';
import { QuestionImageService } from './question-image.service';
import { applyQuestionData } from '../helper/question/question-data.helper';
import { QUESTION_VALIDATION_MESSAGES } from '../validator/question/question-validation-messages';
import { QuestionImageSyncResult } from '../interfaces/question/question-image-sync-result.interface';
import { FilterQuestionsRequest } from '../request/question/filter-questions.request';
import { prepareQuestionFilters } from '../helper/question/question-filters.helper';
import { QuestionAttemptRepository } from '../repository/question-attempt.repository';
import { QuestionAttemptStatistics } from '../interfaces/question/question-statistics.interface';
import { QuestionStatisticsResource } from '../resources/question/question-statistics.resource';
import { QuestionCommentRepository } from '../repository/question-comment.repository';
import { QuestionCommentStorageService } from './question-comment-storage.service';
import type { QuestionDeletionResult } from '../interfaces/question/question-deletion-result.interface';

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);

  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly questionImageService: QuestionImageService,
    private readonly questionDataFactory: QuestionDataFactory,
    private readonly questionResource: QuestionResource,
    private readonly dataSource: DataSource,
    private readonly questionAttemptRepository: QuestionAttemptRepository,
    private readonly questionStatisticsResource: QuestionStatisticsResource,
    private readonly questionCommentRepository: QuestionCommentRepository,
    private readonly questionCommentStorage: QuestionCommentStorageService,
  ) {}

  async create(
    request: CreateQuestionRequest,
    files: Express.Multer.File[],
    teacher: User,
  ) {
    if (teacher.type_profile !== 'teacher') {
      throw new ForbiddenException(
        QUESTION_VALIDATION_MESSAGES.teacherOnlyCreate,
      );
    }

    const data = this.questionDataFactory.create(request);
    let imageSync: QuestionImageSyncResult | undefined;

    let question: Question;
    try {
      question = await this.dataSource.transaction(async (manager) => {
        const question = await this.questionRepository.createFromData(
          data,
          teacher.id,
          manager,
        );
        imageSync = await this.questionImageService.sync(
          question.id,
          [],
          data.images,
          files ?? [],
          manager,
        );
        applyQuestionData(question, data, imageSync.references);
        question.images = imageSync.records;
        return this.questionRepository.save(question, manager);
      });
    } catch (error) {
      if (imageSync?.createdPaths.length) {
        this.questionImageService.cleanPaths(imageSync.createdPaths);
      }
      throw error;
    }
    return this.questionResource.toResponse(question);
  }

  async findAllForTeacher(teacher: User, filters: FilterQuestionsRequest) {
    if (teacher.type_profile !== 'teacher') {
      throw new ForbiddenException(
        QUESTION_VALIDATION_MESSAGES.teacherOnlyList,
      );
    }
    const questions = await this.questionRepository.findByTeacher(
      teacher.id,
      prepareQuestionFilters(filters),
    );
    return questions.map((question) =>
      this.questionResource.toResponse(question),
    );
  }

  async update(
    id: number,
    request: CreateQuestionRequest,
    files: Express.Multer.File[],
    teacher: User,
  ) {
    if (teacher.type_profile !== 'teacher') {
      throw new ForbiddenException(
        QUESTION_VALIDATION_MESSAGES.teacherOnlyUpdate,
      );
    }
    const question = await this.questionRepository.findById(id);
    if (!question) {
      throw new NotFoundException(
        QUESTION_VALIDATION_MESSAGES.questionNotFound,
      );
    }
    if (question.teacher_id !== teacher.id) {
      throw new ForbiddenException(
        QUESTION_VALIDATION_MESSAGES.questionEditForbidden,
      );
    }

    const data = this.questionDataFactory.create(request);
    let imageSync: QuestionImageSyncResult | undefined;

    let saved: Question;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        imageSync = await this.questionImageService.sync(
          question.id,
          question.images ?? [],
          data.images,
          files ?? [],
          manager,
        );
        applyQuestionData(question, data, imageSync.references);
        question.images = imageSync.records;
        return this.questionRepository.save(question, manager);
      });
    } catch (error) {
      if (imageSync?.createdPaths.length) {
        this.questionImageService.cleanPaths(imageSync.createdPaths);
      }
      throw error;
    }
    if (!imageSync)
      throw new Error('A sincronização de imagens não foi concluída.');
    await this.questionImageService.cleanUnusedPaths(imageSync.removedPaths);
    return this.questionResource.toResponse(saved);
  }

  async delete(id: number, teacher: User): Promise<void> {
    if (teacher.type_profile !== 'teacher') {
      throw new ForbiddenException(
        QUESTION_VALIDATION_MESSAGES.teacherOnlyDelete,
      );
    }
    const deletion = await this.dataSource.transaction(
      async (manager): Promise<QuestionDeletionResult> => {
        const question = await this.questionRepository.findForUpdate(
          id,
          manager,
        );
        if (!question) {
          throw new NotFoundException(
            QUESTION_VALIDATION_MESSAGES.questionNotFound,
          );
        }
        if (question.teacher_id !== teacher.id) {
          throw new ForbiddenException(
            QUESTION_VALIDATION_MESSAGES.questionDeleteForbidden,
          );
        }

        const commentIds =
          await this.questionCommentRepository.findIdsByQuestion(id, manager);
        const commentImages =
          await this.questionCommentRepository.findImagesByCommentIds(
            commentIds,
            manager,
          );

        await this.questionAttemptRepository.detachFromQuestion(id, manager);
        await this.questionCommentRepository.detachFromQuestion(
          commentIds,
          manager,
        );
        await this.questionCommentRepository.deleteImagesForComments(
          commentImages,
          manager,
        );
        await this.questionCommentRepository.deleteMentionsForComments(
          commentIds,
          manager,
        );
        await this.questionCommentRepository.detachChildren(
          commentIds,
          manager,
        );
        await this.questionCommentRepository.deleteByIds(commentIds, manager);
        const imagePaths =
          await this.questionRepository.deleteImagesForQuestion(id, manager);

        const remainingReferences =
          await this.questionRepository.findRemainingReferences(id, manager);
        if (remainingReferences.length > 0) {
          const details = remainingReferences
            .map(
              ({ tableName, columnName, count }) =>
                `${tableName}.${columnName} (${count})`,
            )
            .join(', ');
          throw new ConflictException(
            `A questão ainda possui dependências que impedem a exclusão: ${details}.`,
          );
        }

        const deleted = await this.questionRepository.delete(id, manager);
        if (!deleted) {
          throw new NotFoundException(
            QUESTION_VALIDATION_MESSAGES.questionNotFound,
          );
        }
        return {
          deleted,
          imagePaths,
          commentImagePaths: commentImages.map((image) => image.path),
        };
      },
    );
    await this.questionImageService.cleanDeletedQuestionPaths(
      deletion.imagePaths,
    );
    for (const path of deletion.commentImagePaths) {
      try {
        this.questionCommentStorage.remove(path);
      } catch (error) {
        this.logger.error(
          `Não foi possível remover a imagem do comentário após excluir a questão: ${path}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  async getStatistics(id: number, teacher: User) {
    if (teacher.type_profile !== 'teacher') {
      throw new ForbiddenException(
        'Somente professores podem consultar estatísticas de questões.',
      );
    }
    const question = await this.questionRepository.findById(id);
    if (!question) {
      throw new NotFoundException(
        QUESTION_VALIDATION_MESSAGES.questionNotFound,
      );
    }
    if (question.teacher_id !== teacher.id) {
      throw new ForbiddenException(
        'Você não pode consultar estatísticas desta questão.',
      );
    }
    const statistics: QuestionAttemptStatistics =
      await this.questionAttemptRepository.getStatistics(
        id,
        question.option_count,
        question.correct_option,
      );
    return this.questionStatisticsResource.toResponse(question, statistics);
  }
}
