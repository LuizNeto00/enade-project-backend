export class StudentPerformanceFiltersDto {
  answeredFrom?: Date;
  answeredToExclusive?: Date;
  page: number = 1;
  limit: number = 10;
}
