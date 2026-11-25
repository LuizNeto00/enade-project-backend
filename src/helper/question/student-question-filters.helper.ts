import { StudentQuestionFiltersDataDto } from '../../dto/student-question-filters-data.dto';
import { FilterStudentQuestionsRequest } from '../../request/question/filter-student-questions.request';

export function prepareStudentQuestionFilters(
  request: FilterStudentQuestionsRequest,
): StudentQuestionFiltersDataDto {
  const filters = new StudentQuestionFiltersDataDto();
  if (request.search) filters.search = request.search;
  if (request.examYear !== undefined) filters.examYear = request.examYear;
  if (request.course) filters.course = request.course;
  if (request.optionCount !== undefined)
    filters.optionCount = request.optionCount;
  return filters;
}
