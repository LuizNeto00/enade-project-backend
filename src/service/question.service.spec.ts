jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (value: string) => value,
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { QuestionRepository } from '../repository/question.repository';
import { FilterQuestionsRequest } from '../request/question/filter-questions.request';
import { QuestionResource } from '../resources/question/question.resource';
import { QuestionDataFactory } from '../factory/question/question-data.factory';
import { QuestionImageService } from './question-image.service';
import { QuestionService } from './question.service';
import { QuestionAttemptRepository } from '../repository/question-attempt.repository';
import { QuestionStatisticsResource } from '../resources/question/question-statistics.resource';
import { QuestionCommentRepository } from '../repository/question-comment.repository';
import { QuestionCommentStorageService } from './question-comment-storage.service';

describe('QuestionService', () => {
  const makeService = (
    overrides: {
      questionRepository?: Partial<QuestionRepository>;
      dataSource?: { transaction: jest.Mock };
      questionImageService?: Partial<QuestionImageService>;
      questionCommentRepository?: Partial<QuestionCommentRepository>;
      questionAttemptRepository?: Partial<QuestionAttemptRepository>;
      questionCommentStorage?: Partial<QuestionCommentStorageService>;
    } = {},
  ) => {
    const dataSource = overrides.dataSource ?? {
      transaction: jest
        .fn()
        .mockImplementation(
          (callback: (manager: EntityManager) => Promise<unknown>) =>
            callback({} as EntityManager),
        ),
    };
    const questionRepository = {
      findById: jest.fn(),
      findForUpdate: jest.fn(),
      deleteImagesForQuestion: jest.fn(),
      findRemainingReferences: jest.fn(),
      delete: jest.fn(),
      ...overrides.questionRepository,
    };
    const questionImageService = {
      cleanUnusedPaths: jest.fn(),
      cleanDeletedQuestionPaths: jest.fn(),
      ...overrides.questionImageService,
    };
    const questionAttemptRepository = {
      existsForQuestion: jest.fn().mockResolvedValue(false),
      detachFromQuestion: jest.fn().mockResolvedValue(undefined),
      getStatistics: jest.fn(),
      ...overrides.questionAttemptRepository,
    };
    const questionCommentRepository = {
      findIdsByQuestion: jest.fn().mockResolvedValue([]),
      findImagesByCommentIds: jest.fn().mockResolvedValue([]),
      detachFromQuestion: jest.fn().mockResolvedValue(undefined),
      deleteImagesForComments: jest.fn().mockResolvedValue(undefined),
      deleteMentionsForComments: jest.fn().mockResolvedValue(undefined),
      detachChildren: jest.fn().mockResolvedValue(undefined),
      deleteByIds: jest.fn().mockResolvedValue(undefined),
      ...overrides.questionCommentRepository,
    };
    const questionCommentStorage = {
      remove: jest.fn(),
      ...overrides.questionCommentStorage,
    };
    const questionStatisticsResource = {
      toResponse: jest.fn(),
    };
    const service = new QuestionService(
      questionRepository as unknown as QuestionRepository,
      questionImageService as unknown as QuestionImageService,
      {} as QuestionDataFactory,
      {} as QuestionResource,
      dataSource as never,
      questionAttemptRepository as unknown as QuestionAttemptRepository,
      questionStatisticsResource,
      questionCommentRepository as unknown as QuestionCommentRepository,
      questionCommentStorage as unknown as QuestionCommentStorageService,
    );
    return {
      service,
      questionRepository,
      dataSource,
      questionImageService,
      questionAttemptRepository,
      questionCommentRepository,
      questionCommentStorage,
    };
  };

  it('does not allow students to access the teacher question list', async () => {
    const service = new QuestionService(
      {} as QuestionRepository,
      {} as QuestionImageService,
      {} as QuestionDataFactory,
      {} as QuestionResource,
      {} as never,
      {} as QuestionAttemptRepository,
      {} as QuestionStatisticsResource,
      {} as QuestionCommentRepository,
      {} as QuestionCommentStorageService,
    );
    const student = { type_profile: 'student', id: 1 } as User;

    await expect(
      service.findAllForTeacher(student, new FilterQuestionsRequest()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes all question dependents transactionally and cleans files after commit', async () => {
    const order: string[] = [];
    const questionRepository = {
      findForUpdate: jest.fn().mockImplementation(() => {
        order.push('lock-question');
        return Promise.resolve({ id: 21, teacher_id: 7 });
      }),
      deleteImagesForQuestion: jest.fn().mockImplementation(() => {
        order.push('delete-question-images');
        return Promise.resolve(['questions/21/statement/a.png']);
      }),
      findRemainingReferences: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockImplementation(() => {
        order.push('delete-question');
        return Promise.resolve(true);
      }),
    };
    const questionCommentRepository = {
      findIdsByQuestion: jest.fn().mockImplementation(() => {
        order.push('find-comment-ids');
        return Promise.resolve([31, 32, 33]);
      }),
      findImagesByCommentIds: jest
        .fn()
        .mockResolvedValue([
          { id: 5, comment_id: 31, path: 'comments/21/a.png' },
        ]),
      detachFromQuestion: jest.fn().mockImplementation(() => {
        order.push('detach-comments');
      }),
      deleteImagesForComments: jest.fn().mockImplementation(() => {
        order.push('delete-comment-images');
      }),
      deleteMentionsForComments: jest.fn().mockImplementation(() => {
        order.push('delete-mentions');
      }),
      detachChildren: jest.fn().mockImplementation(() => {
        order.push('detach-replies');
      }),
      deleteByIds: jest.fn().mockImplementation(() => {
        order.push('delete-comments');
      }),
    };
    const {
      service,
      dataSource,
      questionImageService,
      questionAttemptRepository,
      questionCommentStorage,
    } = makeService({
      questionRepository,
      questionCommentRepository,
      dataSource: {
        transaction: jest
          .fn()
          .mockImplementation(
            (callback: (manager: EntityManager) => Promise<unknown>) =>
              callback({} as EntityManager).then((result) => {
                order.push('commit');
                return result;
              }),
          ),
      },
      questionImageService: {
        cleanDeletedQuestionPaths: jest.fn(() => {
          order.push('cleanup-question-files');
          return Promise.resolve();
        }),
      },
      questionCommentStorage: {
        remove: jest.fn(() => order.push('cleanup-comment-files')),
      },
    });

    await service.delete(21, { id: 7, type_profile: 'teacher' } as User);

    expect(questionCommentRepository.findIdsByQuestion).toHaveBeenCalledWith(
      21,
      expect.anything(),
    );
    expect(questionCommentRepository.deleteByIds).toHaveBeenCalledWith(
      [31, 32, 33],
      expect.anything(),
    );
    expect(questionCommentRepository.detachChildren).toHaveBeenCalledWith(
      [31, 32, 33],
      expect.anything(),
    );
    expect(questionAttemptRepository.detachFromQuestion).toHaveBeenCalledWith(
      21,
      expect.anything(),
    );
    expect(questionRepository.delete).toHaveBeenCalledWith(
      21,
      expect.anything(),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(questionImageService.cleanDeletedQuestionPaths).toHaveBeenCalledWith(
      ['questions/21/statement/a.png'],
    );
    expect(questionCommentStorage.remove).toHaveBeenCalledWith(
      'comments/21/a.png',
    );
    expect(order).toEqual([
      'lock-question',
      'find-comment-ids',
      'detach-comments',
      'delete-comment-images',
      'delete-mentions',
      'detach-replies',
      'delete-comments',
      'delete-question-images',
      'delete-question',
      'commit',
      'cleanup-question-files',
      'cleanup-comment-files',
    ]);
  });

  it('rejects deleting a missing or another teacher question inside the transaction', async () => {
    const missing = makeService({
      questionRepository: { findForUpdate: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      missing.service.delete(21, { id: 7, type_profile: 'teacher' } as User),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(missing.dataSource.transaction).toHaveBeenCalledTimes(1);

    const notOwned = makeService({
      questionRepository: {
        findForUpdate: jest.fn().mockResolvedValue({ id: 21, teacher_id: 8 }),
      },
    });
    await expect(
      notOwned.service.delete(21, { id: 7, type_profile: 'teacher' } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(notOwned.dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('throws inside the transaction when no question row was deleted', async () => {
    const questionRepository = {
      findForUpdate: jest.fn().mockResolvedValue({ id: 21, teacher_id: 7 }),
      deleteImagesForQuestion: jest.fn().mockResolvedValue([]),
      findRemainingReferences: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(false),
    };
    const { service, dataSource, questionImageService } = makeService({
      questionRepository,
    });

    await expect(
      service.delete(21, { id: 7, type_profile: 'teacher' } as User),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(
      questionImageService.cleanDeletedQuestionPaths,
    ).not.toHaveBeenCalled();
  });

  it('does not clean files when the transaction fails', async () => {
    const questionRepository = {
      findForUpdate: jest.fn().mockResolvedValue({ id: 21, teacher_id: 7 }),
      findRemainingReferences: jest
        .fn()
        .mockRejectedValue(new Error('database failure')),
    };
    const { service, questionImageService } = makeService({
      questionRepository,
    });

    await expect(
      service.delete(21, { id: 7, type_profile: 'teacher' } as User),
    ).rejects.toThrow('database failure');
    expect(
      questionImageService.cleanDeletedQuestionPaths,
    ).not.toHaveBeenCalled();
  });

  it('reports remaining foreign-key dependencies and rolls back before deleting the question', async () => {
    const questionRepository = {
      findForUpdate: jest.fn().mockResolvedValue({ id: 21, teacher_id: 7 }),
      deleteImagesForQuestion: jest.fn().mockResolvedValue([]),
      findRemainingReferences: jest.fn().mockResolvedValue([
        {
          tableName: 'unexpected_answers',
          columnName: 'question_id',
          count: 2,
        },
      ]),
      delete: jest.fn(),
    };
    const { service, questionImageService } = makeService({
      questionRepository,
    });

    await expect(
      service.delete(21, { id: 7, type_profile: 'teacher' } as User),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(questionRepository.delete).not.toHaveBeenCalled();
    expect(
      questionImageService.cleanDeletedQuestionPaths,
    ).not.toHaveBeenCalled();
  });

  it('returns statistics only for an owned question', async () => {
    const ownedQuestion = {
      id: 21,
      teacher_id: 7,
      option_count: 4,
      correct_option: 'C',
      status: 'inactive',
      course: 'Ciência da Computação',
      exam_year: 2021,
      level: 'medium',
      statement: '<p>Questão</p>',
    };
    const questionRepository = {
      findById: jest.fn().mockResolvedValue(ownedQuestion),
    };
    const attemptRepository = {
      existsForQuestion: jest.fn(),
      getStatistics: jest.fn().mockResolvedValue({
        participantCount: 2,
        totalAttempts: 3,
        correctAnswers: 1,
        incorrectAnswers: 1,
        correctPercentage: 50,
        incorrectPercentage: 50,
        alternatives: [],
      }),
    };
    const resource = {
      toResponse: jest.fn().mockReturnValue({ question: { id: '21' } }),
    };
    const service = new QuestionService(
      questionRepository as unknown as QuestionRepository,
      {} as QuestionImageService,
      {} as QuestionDataFactory,
      {} as QuestionResource,
      {} as never,
      attemptRepository as unknown as QuestionAttemptRepository,
      resource,
      {} as QuestionCommentRepository,
      {} as QuestionCommentStorageService,
    );

    await expect(
      service.getStatistics(21, { id: 7, type_profile: 'teacher' } as User),
    ).resolves.toEqual({ question: { id: '21' } });
    expect(attemptRepository.getStatistics).toHaveBeenCalledWith(21, 4, 'C');

    await expect(
      service.getStatistics(21, { id: 8, type_profile: 'teacher' } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
