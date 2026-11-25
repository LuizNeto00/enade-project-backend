import { BadRequestException } from '@nestjs/common';
import { courseOptions } from '../../constants/course-options';
import type {
  QuestionDifficulty,
  QuestionStatus,
} from '../../interfaces/question/question-types';
import { QUESTION_VALIDATION_MESSAGES } from './question-validation-messages';

export function validateQuestionYear(year: number): void {
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2004 || year > currentYear) {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.examYear(currentYear),
    );
  }
}

export function validateQuestionCourse(course: string): void {
  if (!courseOptions.includes(course.trim())) {
    throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.invalidCourse);
  }
}

export function validateQuestionDifficulty(
  value: string,
): asserts value is QuestionDifficulty {
  if (!['easy', 'medium', 'hard'].includes(value)) {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.invalidDifficulty,
    );
  }
}

export function validateQuestionStatus(
  value: string,
): asserts value is QuestionStatus {
  if (!['active', 'inactive'].includes(value)) {
    throw new BadRequestException(
      QUESTION_VALIDATION_MESSAGES.invalidQuestionStatus,
    );
  }
}
