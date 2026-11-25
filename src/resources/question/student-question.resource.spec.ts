jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (value: string) =>
    value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''),
}));

import { Question } from '../../entities/question.entity';
import { ImageStorageService } from '../../service/image-storage.service';
import { StudentQuestionResource } from './student-question.resource';

describe('StudentQuestionResource', () => {
  const createResource = () =>
    new StudentQuestionResource({
      getPublicUrl: (path: string) =>
        `https://api.example.test/uploads/${path}`,
    } as ImageStorageService);

  it('returns only student-safe question data and sanitizes question HTML', () => {
    const question = {
      id: 17,
      teacher_id: 8,
      statement:
        '<p>Enunciado<img src="/uploads/questions/17/statement/a.png"></p><script>alert(1)</script>',
      course: 'Ciência da Computação',
      exam_year: 2021,
      level: 'medium',
      option_count: 4,
      option_a: '<p>Alternativa A</p>',
      option_b: '<p>Alternativa B</p>',
      option_c: '<p>Alternativa C</p>',
      option_d: '<p>Alternativa D</p>',
      option_e: '<p>Não disponível</p>',
      correct_option: 'C',
      answer_comment: 'Gabarito sigiloso',
      status: 'inactive',
      created_at: new Date(),
      updated_at: new Date(),
      images: [
        {
          key: 'statement-image',
          name: 'enunciado.png',
          mime_type: 'image/png',
          size: 10,
          field: 'statement',
          path: 'questions/17/statement/a.png',
        },
        {
          key: 'comment-image',
          name: 'comentario.png',
          mime_type: 'image/png',
          size: 10,
          field: 'answer_comment',
          path: 'questions/17/comment/a.png',
        },
      ],
    } as Question;

    const response = createResource().toResponse(question);

    expect(Object.keys(response)).toEqual([
      'id',
      'statement',
      'course',
      'examYear',
      'level',
      'options',
      'images',
    ]);
    expect(response.statement).toContain(
      'https://api.example.test/uploads/questions/17/statement/a.png',
    );
    expect(response.statement).not.toContain('<script>');
    expect(response.options).toHaveLength(4);
    expect(response.options.map((option) => option.label)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
    expect(response.images).toHaveLength(1);
    expect(response.images[0].field).toBe('statement');
    expect(JSON.stringify(response)).not.toContain('Gabarito sigiloso');
    expect(JSON.stringify(response)).not.toContain('teacherId');
    expect(JSON.stringify(response)).not.toContain('status');
  });

  it('returns correct answer and sanitized comment only from answer resource', () => {
    const question = {
      correct_option: 'B',
      answer_comment: '<p>Explicação</p><script>alert(1)</script>',
    } as Question;

    expect(createResource().toAnswerResponse(question, 'A')).toMatchObject({
      isCorrect: false,
      selectedOption: 'A',
      correctOption: 'B',
      answerComment: '<p>Explicação</p>',
    });
  });

  it('includes alternative E for five-option questions', () => {
    const question = {
      id: 18,
      teacher_id: 8,
      statement: '<p>Enunciado</p>',
      course: 'Ciência da Computação',
      exam_year: 2021,
      level: 'easy',
      option_count: 5,
      option_a: 'A',
      option_b: 'B',
      option_c: 'C',
      option_d: 'D',
      option_e: '<p>E</p>',
      correct_option: 'E',
      answer_comment: 'Explicação',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      images: [],
    } as Question;

    expect(
      createResource()
        .toResponse(question)
        .options.map(({ label }) => label),
    ).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});
