import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import { DataSource } from 'typeorm';
import { MockExamCompletionRepository } from '../repository/mock-exam-completion.repository';
import { MockExamRepository } from '../repository/mock-exam.repository';
import { MockExamResource } from '../resources/mock-exam/mock-exam.resource';
import { FilterStudentMockExamsRequest } from '../request/mock-exam/filter-student-mock-exams.request';
import { prepareQuestionFilters } from '../helper/question/question-filters.helper';

@Injectable()
export class StudentMockExamService {
  constructor(
    private readonly repository: MockExamRepository,
    private readonly resource: MockExamResource,
    private readonly completions: MockExamCompletionRepository,
    private readonly dataSource: DataSource,
  ) {}

  async list(student: User, filters: FilterStudentMockExamsRequest) {
    this.assertStudent(student);
    const exams = await this.repository.findActive(
      prepareQuestionFilters(filters),
    );
    return exams.map((exam) => this.resource.student(exam));
  }

  async details(id: number, student: User) {
    const exam = await this.findActive(id, student);
    return {
      ...this.resource.student(exam),
      completed: await this.completions.exists(id, student.id),
    };
  }

  async complete(id: number, student: User) {
    this.assertStudent(student);
    await this.dataSource.transaction(async (manager) => {
      const exam = await this.repository.findActiveForUpdate(id, manager);
      if (!exam) throw new NotFoundException('Simulado não encontrado.');
      if (!(await this.completions.exists(id, student.id, manager))) {
        await this.completions.create(id, student.id, manager);
      }
    });
    return { completed: true };
  }

  async findCompleted(id: number, student: User) {
    const exam = await this.findActive(id, student);
    if (!(await this.completions.exists(id, student.id))) {
      throw new ForbiddenException(
        'Finalize o estudo para acessar o gabarito.',
      );
    }
    return exam;
  }

  async findActive(id: number, student: User) {
    this.assertStudent(student);
    const exam = await this.repository.findActiveById(id);
    if (!exam) throw new NotFoundException('Simulado não encontrado.');
    return exam;
  }

  private assertStudent(user: User) {
    if (user.type_profile !== 'student') {
      throw new ForbiddenException('Acesso permitido somente a estudantes.');
    }
  }
}
