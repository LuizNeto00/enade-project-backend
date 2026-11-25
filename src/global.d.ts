import type { QuestionImageManifestItem as QuestionImageManifestItemInterface } from './interfaces/question/question-image-manifest.interface';
import type { QuestionImageReference as QuestionImageReferenceInterface } from './interfaces/question/question-image-reference.interface';
import type { ParsedQuestionOptions as ParsedQuestionOptionsInterface } from './interfaces/question/parsed-question-options.interface';

declare global {
  type QuestionImageManifestItem = QuestionImageManifestItemInterface;
  type ParsedQuestionOptions = ParsedQuestionOptionsInterface;
  type QuestionImageReference = QuestionImageReferenceInterface;
}

export {};
