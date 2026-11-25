jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { QuestionFiltersDataDto } from '../dto/question-filters-data.dto';
import { StudentQuestionFiltersDataDto } from '../dto/student-question-filters-data.dto';
import { QuestionRepository } from './question.repository';

describe('QuestionRepository.findByTeacher', () => {
  it('combines filters with the authenticated teacher scope and safe parameters', async () => {
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = new QuestionRepository({
      createQueryBuilder: jest.fn().mockReturnValue(query),
    } as never);
    const filters = Object.assign(new QuestionFiltersDataDto(), {
      search: 'arq%uitetura',
      examYear: 2021,
      course: 'Análise e Desenvolvimento de Sistemas',
      createdFrom: new Date('2026-01-01T03:00:00.000Z'),
      createdToExclusive: new Date('2026-01-02T03:00:00.000Z'),
      status: 'inactive',
    });

    await repository.findByTeacher(37, filters);

    expect(query.where).toHaveBeenCalledWith(
      'question.teacher_id = :teacherId',
      { teacherId: 37 },
    );
    expect(query.andWhere).toHaveBeenCalledTimes(6);
    expect(query.andWhere).toHaveBeenCalledWith(
      'question.exam_year = :examYear',
      { examYear: 2021 },
    );
    expect(query.andWhere).toHaveBeenCalledWith('question.course = :course', {
      course: 'Análise e Desenvolvimento de Sistemas',
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      'question.created_at >= :createdFrom',
      { createdFrom: filters.createdFrom },
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      'question.created_at < :createdToExclusive',
      { createdToExclusive: filters.createdToExclusive },
    );
    expect(query.andWhere).toHaveBeenCalledWith('question.status = :status', {
      status: 'inactive',
    });
    expect(query.orderBy).toHaveBeenCalledWith('question.created_at', 'DESC');
    expect(query.addOrderBy).toHaveBeenCalledWith('question.id', 'DESC');
  });
});

describe('QuestionRepository.deleteImagesForQuestion', () => {
  it('deletes associated image rows and returns their paths', async () => {
    const imageRepository = {
      find: jest.fn().mockResolvedValue([
        { id: 8, path: 'questions/123/a.png' },
        { id: 9, path: 'questions/123/b.png' },
      ]),
      delete: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    const repository = new QuestionRepository({} as never);
    const manager = { getRepository: jest.fn(() => imageRepository) };

    await expect(
      repository.deleteImagesForQuestion(123, manager as never),
    ).resolves.toEqual(['questions/123/a.png', 'questions/123/b.png']);
    expect(imageRepository.delete).toHaveBeenCalledWith([8, 9]);
  });

  it('does not issue a delete when there are no associated images', async () => {
    const imageRepository = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
    };
    const repository = new QuestionRepository({} as never);

    await expect(
      repository.deleteImagesForQuestion(123, {
        getRepository: jest.fn(() => imageRepository),
      } as never),
    ).resolves.toEqual([]);
    expect(imageRepository.delete).not.toHaveBeenCalled();
  });

  it('fails when the image rows could not all be deleted', async () => {
    const imageRepository = {
      find: jest.fn().mockResolvedValue([{ id: 8, path: 'a.png' }]),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const repository = new QuestionRepository({} as never);

    await expect(
      repository.deleteImagesForQuestion(123, {
        getRepository: jest.fn(() => imageRepository),
      } as never),
    ).rejects.toThrow('Não foi possível excluir todos os registros');
  });
});

describe('QuestionRepository.findForStudent', () => {
  it('pins the query to active questions and applies all provided filters', async () => {
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = new QuestionRepository({
      createQueryBuilder: jest.fn().mockReturnValue(query),
    } as never);
    const filters = Object.assign(new StudentQuestionFiltersDataDto(), {
      search: 'algoritmos',
      examYear: 2021,
      course: 'Ciência da Computação',
      optionCount: 5 as const,
    });

    await repository.findForStudent(filters);

    expect(query.where).toHaveBeenCalledWith('question.status = :status', {
      status: 'active',
    });
    expect(query.andWhere).toHaveBeenCalledTimes(4);
    expect(query.andWhere).toHaveBeenCalledWith(
      'question.exam_year = :examYear',
      { examYear: 2021 },
    );
    expect(query.andWhere).toHaveBeenCalledWith('question.course = :course', {
      course: 'Ciência da Computação',
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      'question.option_count = :optionCount',
      { optionCount: 5 },
    );
    expect(query.orderBy).toHaveBeenCalledWith('question.exam_year', 'DESC');
  });
});

describe('QuestionRepository.findActiveById', () => {
  it('always scopes answer lookups to active questions', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const repository = new QuestionRepository({ findOne } as never);

    await repository.findActiveById(32);

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 32, status: 'active' },
    });
  });
});

describe('QuestionRepository.findRemainingReferences', () => {
  it('returns outstanding direct foreign-key references for a question', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { tableName: 'question_comments', columnName: 'question_id' },
      ])
      .mockResolvedValueOnce([{ count: '2' }]);
    const repository = new QuestionRepository({} as never);

    await expect(
      repository.findRemainingReferences(123, { query } as never),
    ).resolves.toEqual([
      { tableName: 'question_comments', columnName: 'question_id', count: 2 },
    ]);
    expect(query).toHaveBeenNthCalledWith(
      2,
      'SELECT COUNT(*) AS count FROM `question_comments` WHERE `question_id` = ?',
      [123],
    );
  });

  it('escapes identifiers obtained from database metadata', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { tableName: 'question`comments', columnName: 'question_id' },
      ])
      .mockResolvedValueOnce([{ count: '0' }]);
    const repository = new QuestionRepository({} as never);

    await expect(
      repository.findRemainingReferences(123, { query } as never),
    ).resolves.toEqual([]);
    expect(query).toHaveBeenNthCalledWith(
      2,
      'SELECT COUNT(*) AS count FROM `question``comments` WHERE `question_id` = ?',
      [123],
    );
  });
});

describe('QuestionRepository.findForUpdate', () => {
  it('loads the question under a pessimistic write lock', async () => {
    const findOne = jest.fn().mockResolvedValue({ id: 123 });
    const repository = new QuestionRepository({} as never);
    const manager = {
      getRepository: jest.fn(() => ({ findOne })),
    };

    await repository.findForUpdate(123, manager as never);

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 123 },
      lock: { mode: 'pessimistic_write' },
    });
  });
});
