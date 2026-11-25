import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsValidExamYear } from '../../validator/question/is-valid-exam-year.validator';

const trim = (value: unknown) =>
  typeof value === 'string' ? value.trim() : value;

export class FilterStudentMockExamsRequest {
  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsValidExamYear()
  examYear?: number;

  @Transform(({ value }) => trim(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  course?: string;
}
