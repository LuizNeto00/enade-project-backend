import { QuestionFiltersDataDto } from '../../dto/question-filters-data.dto';
import { FilterQuestionsRequest } from '../../request/question/filter-questions.request';

const FILTER_TIME_ZONE = 'America/Sao_Paulo';

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  const localTimeAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return localTimeAsUtc - date.getTime();
}

function localDateStartToUtc(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  return new Date(
    utcGuess.getTime() - getTimeZoneOffset(utcGuess, FILTER_TIME_ZONE),
  );
}

function nextCalendarDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}

export function prepareQuestionFilters(
  request: FilterQuestionsRequest,
): QuestionFiltersDataDto {
  const filters = new QuestionFiltersDataDto();
  if (request.search)
    filters.search = request.search.trim().replace(/\s+/g, ' ');
  if (request.examYear !== undefined) filters.examYear = request.examYear;
  if (request.course) filters.course = request.course;
  if (request.createdFrom) {
    filters.createdFrom = localDateStartToUtc(request.createdFrom);
  }
  if (request.createdTo) {
    filters.createdToExclusive = localDateStartToUtc(
      nextCalendarDate(request.createdTo),
    );
  }
  if (request.status) filters.status = request.status;
  return filters;
}
