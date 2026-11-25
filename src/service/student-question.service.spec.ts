jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (value: string) =>
    value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''),
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../entities/user.entity';
import { QuestionRepository } from '../repository/question.repository';
import { StudentQuestionResource } from '../resources/question/student-question.resource';
import { AnswerStudentQuestionRequest } from '../request/question/answer-student-question.request';
import { FilterStudentQuestionsRequest } from '../request/question/filter-student-questions.request';
import { StudentQuestionService } from './student-question.service';
import { QuestionAttemptRepository } from '../repository/question-attempt.repository';
import { DataSource } from 'typeorm';

describe('StudentQuestionService', () => {
  const createService = (
    repositoryOverrides: Partial<QuestionRepository> = {},
  ) => {
    const repository = {
      findForStudent: jest.fn().mockResolvedValue([]),
      findActiveById: jest.fn(),
      ...repositoryOverrides,
    };
    const resource = {
      toResponse: jest.fn((question: { id: number }) => ({
        id: String(question.id),
      })),
      toAnswerResponse: jest.fn(
        (_question: unknown, selectedOption: string) => ({
          isCorrect: selectedOption === 'B',
          selectedOption,
          correctOption: 'B',
          answerComment: 'Explicação',
        }),
      ),
    };
    const attemptRepository = {
      save: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((callback: (manager: never) => Promise<unknown>) =>
          callback({} as never),
        ),
    };
    return {
      service: new StudentQuestionService(
        repository as unknown as QuestionRepository,
        resource as unknown as StudentQuestionResource,
        attemptRepository as unknown as QuestionAttemptRepository,
        dataSource as unknown as DataSource,
      ),
      repository,
      resource,
      attemptRepository,
      dataSource,
    };
  };

  it('lists filtered questions only for students', async () => {
    const { service, repository } = createService();
    const filters = Object.assign(new FilterStudentQuestionsRequest(), {
      search: 'algoritmos',
      examYear: 2021,
      optionCount: 4 as const,
    });

    await service.findAll({ type_profile: 'student' } as User, filters);

    expect(repository.findForStudent).toHaveBeenCalledWith({
      search: 'algoritmos',
      examYear: 2021,
      optionCount: 4,
    });
  });

  it('rejects teacher access to student question search', async () => {
    const { service, repository } = createService();

    await expect(
      service.findAll(
        { type_profile: 'teacher' } as User,
        new FilterStudentQuestionsRequest(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findForStudent).not.toHaveBeenCalled();
  });

  it('verifies answers against active questions and checks option availability', async () => {
    const question = {
      id: 5,
      option_count: 4,
      correct_option: 'B',
      answer_comment: 'Explicação',
    };
    const { service, repository, resource, attemptRepository } = createService({
      findActiveById: jest.fn().mockResolvedValue(question),
    });
    const answer = Object.assign(new AnswerStudentQuestionRequest(), {
      selectedOption: 'B',
    });

    await expect(
      service.answer(5, answer, {
        id: 3,
        type_profile: 'student',
      } as User),
    ).resolves.toMatchObject({ isCorrect: true, correctOption: 'B' });
    expect(repository.findActiveById).toHaveBeenCalledWith(5);
    expect(resource.toAnswerResponse).toHaveBeenCalledWith(question, 'B');
    expect(attemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: 5,
        student_id: 3,
        selected_option: 'B',
        is_correct: true,
      }),
      expect.anything(),
    );

    await expect(
      service.answer(
        5,
        Object.assign(new AnswerStudentQuestionRequest(), {
          selectedOption: 'E',
        }),
        { type_profile: 'student' } as User,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.answer(
        5,
        Object.assign(new AnswerStudentQuestionRequest(), {
          selectedOption: 'E',
        }),
        { type_profile: 'student' } as User,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not answer inactive or missing questions and prevents teacher submissions', async () => {
    const { service, repository, resource } = createService({
      findActiveById: jest.fn().mockResolvedValue(null),
    });
    const answer = Object.assign(new AnswerStudentQuestionRequest(), {
      selectedOption: 'A',
    });

    await expect(
      service.answer(5, answer, { type_profile: 'student' } as User),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.answer(5, answer, { type_profile: 'teacher' } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findActiveById).toHaveBeenCalledTimes(1);
    expect(resource.toAnswerResponse).not.toHaveBeenCalled();
  });

  it('accepts alternative E when a five-option question actually contains it', async () => {
    const question = {
      option_count: 5,
      option_e: '<p>Alternativa E</p>',
      correct_option: 'E',
      answer_comment: 'Explicação da alternativa E',
    };
    const { service, resource } = createService({
      findActiveById: jest.fn().mockResolvedValue(question),
    });

    await service.answer(
      9,
      Object.assign(new AnswerStudentQuestionRequest(), {
        selectedOption: 'E',
      }),
      { type_profile: 'student' } as User,
    );

    expect(resource.toAnswerResponse).toHaveBeenCalledWith(question, 'E');
  });
});
