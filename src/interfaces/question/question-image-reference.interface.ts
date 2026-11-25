import { QuestionImageField } from './question-image-field.type';

export interface QuestionImageReference {
  key: string;
  name: string | null;
  mimeType: string;
  size: number;
  url: string;
  path?: string;
  field: QuestionImageField;
}
