import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
  Validate,
} from 'class-validator';
import { trimStringInput } from '../../helper/shared/transform.helper';
import { PerformanceDateRangeValidator } from '../../validator/student-performance/performance-date-range.validator';

export class FilterPerformanceRequest {
  @Transform(({ value }) => trimStringInput(value))
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Informe uma data inicial válida no formato AAAA-MM-DD.' },
  )
  answeredFrom?: string;

  @Transform(({ value }) => trimStringInput(value))
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Informe uma data final válida no formato AAAA-MM-DD.' },
  )
  @Validate(PerformanceDateRangeValidator)
  answeredTo?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser maior ou igual a 1.' })
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser maior ou igual a 1.' })
  @Max(100, { message: 'O limite não pode exceder 100.' })
  limit?: number = 10;
}
