import { QuestionImage } from '../../entities/question-image.entity';
import { QuestionImageReference } from './question-image-reference.interface';

export interface QuestionImageSyncResult {
  records: QuestionImage[];
  references: QuestionImageReference[];
  createdPaths: string[];
  removedPaths: string[];
}
