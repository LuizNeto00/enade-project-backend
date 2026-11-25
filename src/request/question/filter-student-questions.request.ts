import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { courseOptions } from '../../constants/course-options';
import { IsValidExamYear } from '../../validator/question/is-valid-exam-year.validator';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

export class FilterStudentQuestionsRequest {
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

  @Type(() => Number)
  @IsOptional()
  @IsIn([4, 5], {
    message: 'A quantidade de alternativas deve ser 4 ou 5.',
  })
  optionCount?: 4 | 5;
}
