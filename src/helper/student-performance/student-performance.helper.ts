import { FilterPerformanceRequest } from '../../request/student-performance/filter-performance.request';
import { StudentPerformanceFiltersDto } from '../../dto/student-performance/student-performance-filters.dto';

const TIME_ZONE = 'America/Sao_Paulo';

function getTimeZoneOffset(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
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
  return new Date(utcGuess.getTime() - getTimeZoneOffset(utcGuess));
}

export function prepareStudentPerformanceFilters(
  request: FilterPerformanceRequest,
): StudentPerformanceFiltersDto {
  const filters = new StudentPerformanceFiltersDto();
  if (request.answeredFrom) {
    filters.answeredFrom = localDateStartToUtc(request.answeredFrom);
  }
  if (request.answeredTo) {
    const [year, month, day] = request.answeredTo.split('-').map(Number);
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    const iso = nextDay.toISOString().slice(0, 10);
    filters.answeredToExclusive = localDateStartToUtc(iso);
  }
  filters.page = request.page ?? 1;
  filters.limit = request.limit ?? 10;
  return filters;
}
