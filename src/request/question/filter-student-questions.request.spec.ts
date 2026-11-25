import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { prepareStudentQuestionFilters } from '../../helper/question/student-question-filters.helper';
import { FilterStudentQuestionsRequest } from './filter-student-questions.request';

describe('FilterStudentQuestionsRequest', () => {
  it('normalizes and maps optional student filters', () => {
    const request = plainToInstance(FilterStudentQuestionsRequest, {
      search: '  banco   de dados ',
      examYear: '2021',
      course: 'Ciência da Computação',
      optionCount: '5',
    });

    expect(request.search).toBe('banco de dados');
    expect(prepareStudentQuestionFilters(request)).toEqual({
      search: 'banco de dados',
      examYear: 2021,
      course: 'Ciência da Computação',
      optionCount: 5,
    });
  });

  it('allows empty filters and rejects invalid years, courses, and option counts', async () => {
    const empty = plainToInstance(FilterStudentQuestionsRequest, {});
    expect(await validate(empty)).toEqual([]);
    expect(prepareStudentQuestionFilters(empty)).toEqual({});

    const invalid = plainToInstance(FilterStudentQuestionsRequest, {
      examYear: '1900',
      course: 'Curso não cadastrado',
      optionCount: '6',
    });
    const errors = await validate(invalid);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['examYear', 'course', 'optionCount']),
    );
  });
});
