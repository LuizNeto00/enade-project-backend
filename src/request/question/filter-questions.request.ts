import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { courseOptions } from '../../constants/course-options';
import type { QuestionStatus } from '../../interfaces/question/question-types';
import { IsValidExamYear } from '../../validator/question/is-valid-exam-year.validator';
import { CreatedDateRangeValidator } from '../../validator/question/question-filter.validator';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

export class FilterQuestionsRequest {
  @Transform(({ value }) => normalizeText(value))
  @IsOptional()
  @IsString({ message: 'A busca rápida deve ser um texto.' })
  @MaxLength(100, {
    message: 'A busca rápida deve ter no máximo 100 caracteres.',
  })
  search?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'Informe um ano inteiro válido.' })
  @Min(2004, { message: 'O ano deve ser igual ou posterior a 2004.' })
  @IsValidExamYear()
  examYear?: number;

  @Transform(({ value }) => normalizeText(value))
  @IsOptional()
  @IsString({ message: 'O curso deve ser um texto.' })
  @IsIn(courseOptions, { message: 'Selecione um curso válido.' })
  course?: string;

  @Transform(({ value }) => normalizeText(value))
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Informe uma data inicial válida no formato AAAA-MM-DD.' },
  )
  createdFrom?: string;

  @Transform(({ value }) => normalizeText(value))
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Informe uma data final válida no formato AAAA-MM-DD.' },
  )
  @Validate(CreatedDateRangeValidator)
  createdTo?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'], {
    message: 'O status deve ser active ou inactive.',
  })
  status?: QuestionStatus;
}
