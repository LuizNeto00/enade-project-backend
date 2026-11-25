import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { prepareStudentPerformanceFilters } from '../../helper/student-performance/student-performance.helper';
import { FilterPerformanceRequest } from './filter-performance.request';

describe('FilterPerformanceRequest', () => {
  it('accepts an initial date, final date or both', async () => {
    for (const input of [
      { answeredFrom: '2026-11-01' },
      { answeredTo: '2026-11-25' },
      { answeredFrom: '2026-11-01', answeredTo: '2026-11-25' },
      {},
    ]) {
      const request = plainToInstance(FilterPerformanceRequest, input);
      expect(await validate(request)).toEqual([]);
    }
  });

  it('rejects invalid dates and a reversed range', async () => {
    const request = plainToInstance(FilterPerformanceRequest, {
      answeredFrom: '2026-11-26',
      answeredTo: '2026-11-25',
    });
    const errors = await validate(request);
    expect(errors.map((error) => error.property)).toContain('answeredTo');
  });

  it('prepares pagination and next-day exclusive final date', () => {
    const request = plainToInstance(FilterPerformanceRequest, {
      answeredFrom: '2026-11-01',
      answeredTo: '2026-11-25',
      page: '3',
      limit: '20',
    });
    const filters = prepareStudentPerformanceFilters(request);
    expect(filters.page).toBe(3);
    expect(filters.limit).toBe(20);
    expect(filters.answeredFrom).toBeInstanceOf(Date);
    expect(filters.answeredToExclusive).toBeInstanceOf(Date);
  });
});
