import type { QuestionOptionLabel } from './question-types';
import type { QuestionImageField } from './question-image-field.type';

export type StudentQuestionImageField = Exclude<
  QuestionImageField,
  'answer_comment'
>;

export interface StudentQuestionOptionResponse {
  label: QuestionOptionLabel;
  text: string;
}

export interface StudentQuestionImageResponse {
  key: string;
  name: string | null;
  mimeType: string;
  size: number;
  field: StudentQuestionImageField;
  url: string;
}

export interface StudentQuestionResponse {
  id: string;
  statement: string;
  course: string;
  examYear: number;
  level: 'Fácil' | 'Médio' | 'Difícil';
  options: StudentQuestionOptionResponse[];
  images: StudentQuestionImageResponse[];
}

export interface StudentQuestionAnswerResponse {
  isCorrect: boolean;
  selectedOption: QuestionOptionLabel;
  correctOption: QuestionOptionLabel;
  answerComment: string;
}
