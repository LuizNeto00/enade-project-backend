import { QuestionImageField } from './question-image-field.type';
import { QuestionOptionResponse } from './parsed-question-options.interface';
import { QuestionStatus } from './question-types';

export interface QuestionResponse {
  id: string;
  teacherId: string;
  statement: string;
  course: string;
  examYear: number;
  level: 'Fácil' | 'Médio' | 'Difícil';
  optionCount: 4 | 5;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string | null;
  answerComment: string;
  options: QuestionOptionResponse[];
  correctOption: string;
  status: QuestionStatus;
  images: Array<{
    id: string;
    key: string;
    name: string | null;
    mimeType: string;
    size: number;
    field: QuestionImageField;
    path: string;
    url: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
