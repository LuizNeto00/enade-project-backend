import {
  QuestionDifficulty,
  QuestionOptionLabel,
  QuestionStatus,
} from '../interfaces/question/question-types';
import { QuestionImageField } from '../interfaces/question/question-image-field.type';

export class CreateQuestionImageDataDto {
  clientId: string = '';
  field: QuestionImageField = 'statement';
  mimeType: string = '';
  size: number = 0;
  name: string | null = null;
}

export class CreateQuestionDataDto {
  statement: string = '';
  course: string = '';
  examYear: number = 2004;
  level: QuestionDifficulty = 'easy';
  optionCount: 4 | 5 = 4;
  optionA: string = '';
  optionB: string = '';
  optionC: string = '';
  optionD: string = '';
  optionE: string | null = null;
  correctOption: QuestionOptionLabel = 'A';
  answerComment: string = '';
  status: QuestionStatus = 'active';
  images: CreateQuestionImageDataDto[] = [];
}
