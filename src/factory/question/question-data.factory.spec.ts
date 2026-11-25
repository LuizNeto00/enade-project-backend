import { BadRequestException } from '@nestjs/common';
jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (value: string) => value,
}));

import { CreateQuestionRequest } from '../../request/question/create-question.request';
import { QuestionDataFactory } from './question-data.factory';

const makeRequest = (
  overrides: Partial<CreateQuestionRequest> = {},
): CreateQuestionRequest => ({
  statement: '<p>Enunciado da questão</p>',
  course: 'Análise e Desenvolvimento de Sistemas',
  examYear: '2014',
  level: 'Fácil',
  optionCount: '4',
  options: JSON.stringify([
    { label: 'A', text: '<p>Alternativa A</p>' },
    { label: 'B', text: '<p>Alternativa B</p>' },
    { label: 'C', text: '<p>Alternativa C</p>' },
    { label: 'D', text: '<p>Alternativa D</p>' },
  ]),
  correctOption: 'c',
  answerComment: '<p>Explicação da resposta</p>',
  imageManifest: '[]',
  ...overrides,
});

describe('QuestionDataFactory', () => {
  const factory = new QuestionDataFactory();

  it('normalizes and distributes four options', () => {
    const data = factory.create(makeRequest());

    expect(data).toMatchObject({
      examYear: 2014,
      level: 'easy',
      optionCount: 4,
      optionA: '<p>Alternativa A</p>',
      optionD: '<p>Alternativa D</p>',
      optionE: null,
      correctOption: 'C',
      status: 'active',
    });
  });

  it('preserves the selected question status', () => {
    const data = factory.create(makeRequest({ status: 'inactive' }));
    expect(data.status).toBe('inactive');
  });

  it('maps a fifth option and validates its image association', () => {
    const options = JSON.parse(makeRequest().options) as Array<{
      label: string;
      text: string;
    }>;
    options.push({
      label: 'E',
      text: '<p>Alternativa E <img src="blob:preview" data-question-image-key="image-e"></p>',
    });

    const data = factory.create(
      makeRequest({
        optionCount: '5',
        options: JSON.stringify(options),
        correctOption: 'E',
        imageManifest: JSON.stringify([
          {
            clientId: 'image-e',
            name: 'image.png',
            mimeType: 'image/png',
            size: 128,
            field: 'option_e',
          },
        ]),
      }),
    );

    expect(data.optionE).toContain('data-question-image-key="image-e"');
    expect(data.images[0]).toMatchObject({
      clientId: 'image-e',
      field: 'option_e',
    });
  });

  it('accepts text and an associated image in the same content field', () => {
    const clientId = 'statement-image';
    const data = factory.create(
      makeRequest({
        statement: `<p>Enunciado com texto <img src="blob:preview" data-question-image-key="${clientId}"></p>`,
        imageManifest: JSON.stringify([
          {
            clientId,
            name: 'captura.png',
            mimeType: 'image/png',
            size: 128,
            field: 'statement',
          },
        ]),
      }),
    );

    expect(data.statement).toContain('Enunciado com texto');
    expect(data.images).toEqual([
      expect.objectContaining({ clientId, field: 'statement' }),
    ]);
  });

  it('rejects invalid option count and unassociated images', () => {
    expect(() => factory.create(makeRequest({ optionCount: '5' }))).toThrow(
      BadRequestException,
    );

    const options = JSON.parse(makeRequest().options) as Array<{
      label: string;
      text: string;
    }>;
    options[0].text = '<p>Texto<img src="blob:preview"></p>';
    expect(() =>
      factory.create(
        makeRequest({
          options: JSON.stringify(options),
          imageManifest: '[]',
        }),
      ),
    ).toThrow(BadRequestException);
  });
});
