import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { FilterStudentMockExamsRequest } from './filter-student-mock-exams.request';
import { FilterMockExamsRequest } from './filter-mock-exams.request';

describe('student mock exam filters', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const options = {
    type: 'query' as const,
    metatype: FilterStudentMockExamsRequest,
  };

  it('transforms valid filters and permits an empty query', async () => {
    await expect(pipe.transform({}, options)).resolves.toEqual(
      expect.any(FilterStudentMockExamsRequest),
    );
    await expect(
      pipe.transform(
        { search: ' física ', examYear: '2024', course: ' Física ' },
        options,
      ),
    ).resolves.toMatchObject({
      search: 'física',
      examYear: 2024,
      course: 'Física',
    });
  });

  it.each([
    { status: 'inactive' },
    { createdFrom: '2026-01-01' },
    { examYear: '2003' },
    { examYear: '9999' },
    { search: 'x'.repeat(101) },
  ])('rejects invalid or unauthorized parameters', async (value) => {
    await expect(pipe.transform(value, options)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retains the inherited filters for teachers', async () => {
    await expect(
      pipe.transform(
        {
          search: ' Física ',
          examYear: '2024',
          course: 'Física',
          status: 'inactive',
        },
        { type: 'query', metatype: FilterMockExamsRequest },
      ),
    ).resolves.toMatchObject({
      search: 'Física',
      examYear: 2024,
      course: 'Física',
      status: 'inactive',
    });
  });
});
