import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AnswerStudentQuestionRequest } from './answer-student-question.request';

describe('AnswerStudentQuestionRequest', () => {
  it('accepts a valid option label and rejects invalid payloads', async () => {
    const valid = plainToInstance(AnswerStudentQuestionRequest, {
      selectedOption: 'C',
    });
    expect(await validate(valid)).toEqual([]);

    const invalid = plainToInstance(AnswerStudentQuestionRequest, {
      selectedOption: 'Z',
    });
    expect((await validate(invalid)).map((error) => error.property)).toContain(
      'selectedOption',
    );

    const missing = plainToInstance(AnswerStudentQuestionRequest, {});
    expect((await validate(missing)).map((error) => error.property)).toContain(
      'selectedOption',
    );
  });
});
