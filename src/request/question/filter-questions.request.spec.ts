import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { prepareQuestionFilters } from '../../helper/question/question-filters.helper';
import { FilterQuestionsRequest } from './filter-questions.request';

describe('FilterQuestionsRequest', () => {
  it('normalizes search text and converts inclusive Sao Paulo date filters to UTC', () => {
    const request = plainToInstance(FilterQuestionsRequest, {
      search: '  arquitetura   de   software ',
      createdFrom: '2026-11-25',
      createdTo: '2026-11-25',
    });

    expect(request.search).toBe('arquitetura de software');
    expect(prepareQuestionFilters(request)).toMatchObject({
      search: 'arquitetura de software',
      createdFrom: new Date('2026-11-25T03:00:00.000Z'),
      createdToExclusive: new Date('2026-11-26T03:00:00.000Z'),
    });
  });

  it('rejects invalid date order, dates, status, and arbitrary courses', async () => {
    const request = plainToInstance(FilterQuestionsRequest, {
      createdFrom: '2026-11-26',
      createdTo: '2026-11-25',
      course: 'Curso inexistente',
      status: 'pending',
    });
    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['createdTo', 'course', 'status']),
    );
  });
});
