import { Transform } from 'class-transformer';
import { IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateQuestionCommentRequest {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(3000)
  content?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  removeImageIds?: string;
}
