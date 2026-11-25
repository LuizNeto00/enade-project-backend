import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, Validate } from 'class-validator';
import { trimStringInput } from '../../helper/shared/transform.helper';
import { TeacherDashboardDateRangeValidator } from '../../validator/teacher-dashboard/teacher-dashboard-date-range.validator';

export class TeacherDashboardRequest {
  @Transform(({ value }) => trimStringInput(value))
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Informe uma data inicial válida no formato AAAA-MM-DD.' },
  )
  @Validate(TeacherDashboardDateRangeValidator)
  from?: string;

  @Transform(({ value }) => trimStringInput(value))
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Informe uma data final válida no formato AAAA-MM-DD.' },
  )
  @Validate(TeacherDashboardDateRangeValidator)
  to?: string;
}
