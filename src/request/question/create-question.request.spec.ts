import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuestionRequest } from './create-question.request';

describe('CreateQuestionRequest examYear', () => {
  const currentYear = new Date().getFullYear();

  it('accepts the minimum exam year', async () => {
    const request = plainToInstance(CreateQuestionRequest, {
      statement: '<p>Enunciado</p>',
      course: 'Engenharia de Sistemas',
      examYear: '2004',
      level: 'Fácil',
      optionCount: '4',
      options: '[]',
      correctOption: 'A',
      answerComment: '<p>Resposta</p>',
      imageManifest: '[]',
    });
    const errors = await validate(request);
    expect(errors.some((error) => error.property === 'examYear')).toBe(false);
  });

  it('accepts the dynamic current year', async () => {
    const request = plainToInstance(CreateQuestionRequest, {
      statement: '<p>Enunciado</p>',
      course: 'Engenharia de Sistemas',
      examYear: String(currentYear),
      level: 'Fácil',
      optionCount: '4',
      options: '[]',
      correctOption: 'A',
      answerComment: '<p>Resposta</p>',
      imageManifest: '[]',
    });
    const errors = await validate(request);
    expect(errors.some((error) => error.property === 'examYear')).toBe(false);
  });

  it.each(['2003', String(currentYear + 1), '2014.5', '20a4', '', '201'])(
    'rejects invalid exam year %s',
    async (examYear) => {
      const request = plainToInstance(CreateQuestionRequest, {
        statement: '<p>Enunciado</p>',
        course: 'Engenharia de Sistemas',
        examYear,
        level: 'Fácil',
        optionCount: '4',
        options: '[]',
        correctOption: 'A',
        answerComment: '<p>Resposta</p>',
        imageManifest: '[]',
      });
      const errors = await validate(request);
      const yearError = errors.find((error) => error.property === 'examYear');
      expect(yearError).toBeDefined();
      expect(Object.values(yearError?.constraints ?? {}).join(' ')).toContain(
        `O ano da questão deve estar entre 2004 e ${currentYear}.`,
      );
    },
  );

  it.each(['active', 'inactive'])(
    'accepts the %s question status',
    async (status) => {
      const request = plainToInstance(CreateQuestionRequest, {
        status,
      });
      const errors = await validate(request);
      expect(errors.some((error) => error.property === 'status')).toBe(false);
    },
  );

  it('rejects statuses outside the supported values', async () => {
    const request = plainToInstance(CreateQuestionRequest, {
      status: 'pending',
    });
    const errors = await validate(request);
    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });
});
