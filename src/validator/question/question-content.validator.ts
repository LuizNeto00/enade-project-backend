import { BadRequestException } from '@nestjs/common';
import { hasQuestionContent } from '../../helper/question/question-content.helper';
import { QUESTION_VALIDATION_MESSAGES } from './question-validation-messages';

export function validateQuestionContent(
  content: string,
  field: 'statement' | 'answerComment',
): void {
  if (!hasQuestionContent(content)) {
    throw new BadRequestException(
      field === 'statement'
        ? QUESTION_VALIDATION_MESSAGES.invalidStatement
        : QUESTION_VALIDATION_MESSAGES.invalidAnswerComment,
    );
  }
}
