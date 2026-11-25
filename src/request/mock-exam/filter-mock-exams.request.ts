import {
  IsDateString,
  IsIn,
  IsOptional,
  Matches,
  Validate,
} from 'class-validator';
import { CreatedDateRangeValidator } from '../../validator/question/question-filter.validator';
import { FilterStudentMockExamsRequest } from './filter-student-mock-exams.request';

export class FilterMockExamsRequest extends FilterStudentMockExamsRequest {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  createdFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  @Validate(CreatedDateRangeValidator)
  createdTo?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
