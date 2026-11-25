import { BadRequestException } from '@nestjs/common';
import { hasQuestionContent } from '../../helper/question/question-content.helper';
import { ParsedQuestionOption } from '../../interfaces/question/parsed-question-options.interface';
import { normalizeOptionLabel } from '../../helper/question/question-options.helper';
import { QUESTION_VALIDATION_MESSAGES } from './question-validation-messages';

export function validateQuestionOptions(
  received: ParsedQuestionOption[],
  optionCount: number,
  correctOption: string,
): ParsedQuestionOptions {
  if (
    !Number.isInteger(optionCount) ||
    (optionCount !== 4 && optionCount !== 5)
  ) {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.invalidOptionCount,
    );
  }
  if (received.length !== optionCount) {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.optionCountMismatch,
    );
  }

  const labels =
    optionCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];
  const contents = new Map<string, string>();
  for (const option of received) {
    const label =
      typeof option?.label === 'string'
        ? normalizeOptionLabel(option.label)
        : '';
    if (!labels.includes(label)) {
      throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.optionLabels);
    }
    if (contents.has(label)) {
      throw new BadRequestException(
        QUESTION_VALIDATION_MESSAGES.duplicateOption,
      );
    }
    if (typeof option.text !== 'string' || !hasQuestionContent(option.text)) {
      throw new BadRequestException(
        QUESTION_VALIDATION_MESSAGES.invalidOptionContent(label),
      );
    }
    contents.set(label, option.text);
  }
  for (const label of labels) {
    if (!contents.has(label)) {
      throw new BadRequestException(
        QUESTION_VALIDATION_MESSAGES.missingOption(label),
      );
    }
  }

  const normalizedCorrectOption = normalizeOptionLabel(correctOption);
  if (
    !labels.includes(normalizedCorrectOption) ||
    !contents.has(normalizedCorrectOption)
  ) {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.invalidCorrectOption,
    );
  }

  return {
    A: contents.get('A') ?? '',
    B: contents.get('B') ?? '',
    C: contents.get('C') ?? '',
    D: contents.get('D') ?? '',
    E: optionCount === 5 ? (contents.get('E') ?? null) : null,
  };
}
