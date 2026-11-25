import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import { FilterPerformanceRequest } from '../request/student-performance/filter-performance.request';
import { prepareStudentPerformanceFilters } from '../helper/student-performance/student-performance.helper';
import { StudentPerformanceRepository } from '../repository/student-performance.repository';
import { StudentPerformanceResource } from '../resources/student-performance/student-performance.resource';

@Injectable()
export class StudentPerformanceService {
  constructor(
    private readonly repository: StudentPerformanceRepository,
    private readonly resource: StudentPerformanceResource,
  ) {}

  async getSummary(student: User, request: FilterPerformanceRequest) {
    this.assertStudent(student);
    const summary = await this.repository.getSummary(
      student.id,
      prepareStudentPerformanceFilters(request),
    );
    return this.resource.toSummary(summary);
  }

  async getAttempts(student: User, request: FilterPerformanceRequest) {
    this.assertStudent(student);
    const page = await this.repository.getAttemptsPage(
      student.id,
      prepareStudentPerformanceFilters(request),
    );
    return this.resource.toAttemptsPage(page);
  }

  async getAttempt(student: User, attemptId: number) {
    this.assertStudent(student);
    const attempt = await this.repository.getAttempt(student.id, attemptId);
    if (!attempt) {
      throw new NotFoundException('Tentativa não encontrada.');
    }
    return this.resource.toAttempt(attempt);
  }

  private assertStudent(student: User): void {
    if (student.type_profile !== 'student') {
      throw new ForbiddenException(
        'Somente alunos podem consultar seu desempenho.',
      );
    }
  }
}
