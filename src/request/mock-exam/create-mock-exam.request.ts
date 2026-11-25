import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimStringInput } from '../../helper/shared/transform.helper';
import { IsValidExamYear } from '../../validator/question/is-valid-exam-year.validator';

export class CreateMockExamRequest {
  @Transform(({ value }) => trimStringInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string = '';

  @Transform(({ value }) => trimStringInput(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  course: string = '';

  @IsValidExamYear()
  examYear: string = '';

  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive' = 'active';
}
