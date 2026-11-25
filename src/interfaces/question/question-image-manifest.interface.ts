import { QuestionImageField } from './question-image-field.type';

export interface QuestionImageManifestItem {
  clientId: string;
  name: string | null;
  mimeType: string;
  size: number;
  field: QuestionImageField;
}
