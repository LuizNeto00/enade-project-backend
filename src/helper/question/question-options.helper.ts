import { BadRequestException } from '@nestjs/common';
import { ParsedQuestionOption } from '../../interfaces/question/parsed-question-options.interface';

export function parseQuestionOptions(value: string): ParsedQuestionOption[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed as ParsedQuestionOption[];
  } catch {
    throw new BadRequestException(
      'O campo alternativas possui um formato inválido.',
    );
  }
}

export function normalizeOptionLabel(label: string): string {
  return label.trim().toUpperCase();
}
