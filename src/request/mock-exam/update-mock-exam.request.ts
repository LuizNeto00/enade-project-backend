import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { trimStringInput } from '../../helper/shared/transform.helper';
import { IsValidExamYear } from '../../validator/question/is-valid-exam-year.validator';

export class UpdateMockExamRequest {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => trimStringInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => trimStringInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  course?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsValidExamYear()
  examYear?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
