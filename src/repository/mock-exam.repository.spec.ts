jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { Brackets } from 'typeorm';
import { prepareQuestionFilters } from '../helper/question/question-filters.helper';
import { MockExamRepository } from './mock-exam.repository';

describe('MockExamRepository.findByTeacher', () => {
  it('combines all filters and includes the whole final day', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn<unknown, [unknown, ...unknown[]]>().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = new MockExamRepository({
      createQueryBuilder: jest.fn().mockReturnValue(query),
    } as never);
    const filters = prepareQuestionFilters({
      search: 'Física',
      examYear: 2024,
      course: 'Física',
      createdFrom: '2026-01-01',
      createdTo: '2026-11-25',
      status: 'active',
    });

    await repository.findByTeacher(37, filters);

    expect(query.where).toHaveBeenCalledWith('exam.teacher_id = :teacherId', {
      teacherId: 37,
    });
    expect(query.andWhere).toHaveBeenCalledTimes(6);
    const search = query.andWhere.mock.calls[0][0];
    expect(search).toBeInstanceOf(Brackets);
    if (!(search instanceof Brackets))
      throw new Error('Filtro de busca ausente.');
    const searchQuery = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
    };
    search.whereFactory(searchQuery as never);
    expect(searchQuery.where).toHaveBeenCalledWith(
      'CAST(exam.id AS CHAR) = :id',
      { id: 'Física' },
    );
    expect(searchQuery.orWhere).toHaveBeenCalledWith(
      "exam.title LIKE :search ESCAPE '\\\\'",
      { search: '%Física%' },
    );
    expect(query.andWhere).toHaveBeenCalledWith('exam.course = :course', {
      course: 'Física',
    });
    expect(query.andWhere).toHaveBeenCalledWith('exam.exam_year = :examYear', {
      examYear: 2024,
    });
    expect(query.andWhere).toHaveBeenCalledWith('exam.status = :status', {
      status: 'active',
    });
    expect(query.andWhere).toHaveBeenCalledWith('exam.created_at >= :from', {
      from: new Date('2026-01-01T03:00:00.000Z'),
    });
    expect(query.andWhere).toHaveBeenCalledWith('exam.created_at < :to', {
      to: new Date('2026-11-26T03:00:00.000Z'),
    });
  });
});

describe('MockExamRepository.findActive', () => {
  it.each([
    [{}, 0],
    [{ search: 'Física' }, 1],
    [{ search: '12' }, 1],
    [{ examYear: 2024 }, 1],
    [{ course: 'Física' }, 1],
  ])(
    'keeps active-only scope for individual filters',
    async (filters, count) => {
      const query = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      const repository = new MockExamRepository({
        createQueryBuilder: jest.fn().mockReturnValue(query),
      } as never);
      await repository.findActive(filters);
      expect(query.where).toHaveBeenCalledWith('exam.status = :activeStatus', {
        activeStatus: 'active',
      });
      expect(query.andWhere).toHaveBeenCalledTimes(count);
    },
  );

  it('always restricts the student listing to active exams while combining filters', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn<unknown, [unknown, ...unknown[]]>().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = new MockExamRepository({
      createQueryBuilder: jest.fn().mockReturnValue(query),
    } as never);
    const filters = {
      search: '12%_',
      examYear: 2024,
      course: 'Física',
      status: 'inactive',
    };
    await repository.findActive(filters);
    expect(query.where).toHaveBeenCalledWith('exam.status = :activeStatus', {
      activeStatus: 'active',
    });
    expect(query.andWhere).toHaveBeenCalledTimes(3);
    expect(query.andWhere).toHaveBeenCalledWith('exam.course = :course', {
      course: 'Física',
    });
    expect(query.andWhere).toHaveBeenCalledWith('exam.exam_year = :examYear', {
      examYear: 2024,
    });
    const search = query.andWhere.mock.calls[0][0];
    if (!(search instanceof Brackets))
      throw new Error('Filtro de busca ausente.');
    const searchQuery = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
    };
    search.whereFactory(searchQuery as never);
    expect(searchQuery.where).toHaveBeenCalledWith(
      "CAST(exam.id AS CHAR) LIKE :search ESCAPE '\\\\'",
      { search: '%12\\%\\_%' },
    );
    expect(searchQuery.orWhere).toHaveBeenCalledWith(
      "exam.title LIKE :search ESCAPE '\\\\'",
      { search: '%12\\%\\_%' },
    );
    expect(query.orderBy).toHaveBeenCalledWith('exam.created_at', 'DESC');
    expect(query.addOrderBy).toHaveBeenCalledWith('exam.id', 'DESC');
  });

  it('restricts direct lookup to active exams', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const repository = new MockExamRepository({ findOne } as never);
    await expect(repository.findActiveById(12)).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 12, status: 'active' },
    });
  });
});
