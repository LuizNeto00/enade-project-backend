import { BadRequestException } from '@nestjs/common';
import { QuestionImageField } from '../../interfaces/question/question-image-field.type';
import { QuestionImageManifestItem } from '../../interfaces/question/question-image-manifest.interface';
import { QUESTION_VALIDATION_MESSAGES } from './question-validation-messages';

const QUESTION_IMAGE_FIELDS = new Set<QuestionImageField>([
  'statement',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'option_e',
  'answer_comment',
]);

export function parseQuestionImageManifest(
  value: string,
): QuestionImageManifestItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.invalidImageManifest,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.invalidImageManifest,
    );
  }
  return parsed as QuestionImageManifestItem[];
}

export function validateQuestionImageManifest(
  manifest: QuestionImageManifestItem[],
  htmlByField: Record<QuestionImageField, string>,
): void {
  const keys = new Set<string>();
  for (const image of manifest) {
    if (
      !image ||
      typeof image.clientId !== 'string' ||
      !image.clientId.trim() ||
      !/^[a-zA-Z0-9._-]{1,100}$/.test(image.clientId) ||
      (image.name !== null && typeof image.name !== 'string') ||
      typeof image.mimeType !== 'string' ||
      !Number.isInteger(image.size) ||
      image.size <= 0 ||
      !QUESTION_IMAGE_FIELDS.has(image.field)
    ) {
      throw new BadRequestException(
        QUESTION_VALIDATION_MESSAGES.invalidImageField,
      );
    }
    if (keys.has(image.clientId)) {
      throw new BadRequestException(
        QUESTION_VALIDATION_MESSAGES.invalidImageManifest,
      );
    }
    keys.add(image.clientId);
    if (
      !htmlByField[image.field].includes(
        `data-question-image-key="${image.clientId}"`,
      )
    ) {
      throw new BadRequestException(
        QUESTION_VALIDATION_MESSAGES.invalidImageReference,
      );
    }
  }
  for (const [field, html] of Object.entries(htmlByField) as [
    QuestionImageField,
    string,
  ][]) {
    const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
    for (const tag of imageTags) {
      const key = tag.match(/\bdata-question-image-key="([^"]+)"/i)?.[1];
      if (
        !key ||
        !manifest.some(
          (image) => image.field === field && image.clientId === key,
        )
      ) {
        throw new BadRequestException(
          QUESTION_VALIDATION_MESSAGES.invalidImageReference,
        );
      }
    }
  }
}

export function validateQuestionImageFileCount(
  fileCount: number,
  manifestCount: number,
): void {
  if (fileCount !== manifestCount) {
    throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.imageFileCount);
  }
}
