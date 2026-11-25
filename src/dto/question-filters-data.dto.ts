import type { QuestionStatus } from '../interfaces/question/question-types';

export class QuestionFiltersDataDto {
  search?: string;
  examYear?: number;
  course?: string;
  createdFrom?: Date;
  createdToExclusive?: Date;
  status?: QuestionStatus;
}
