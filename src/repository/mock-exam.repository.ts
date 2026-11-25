import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { MockExam } from '../entities/mock-exam.entity';
import { QuestionFiltersDataDto } from '../dto/question-filters-data.dto';

@Injectable()
export class MockExamRepository {
  constructor(
    @InjectRepository(MockExam)
    private readonly repository: Repository<MockExam>,
  ) {}

  findActive(
    filters: Pick<QuestionFiltersDataDto, 'search' | 'examYear' | 'course'>,
  ) {
    const query = this.repository
      .createQueryBuilder('exam')
      .where('exam.status = :activeStatus', { activeStatus: 'active' });
    this.applyCommonFilters(query, filters, true);
    return query
      .orderBy('exam.created_at', 'DESC')
      .addOrderBy('exam.id', 'DESC')
      .getMany();
  }

  findActiveById(id: number) {
    return this.repository.findOne({ where: { id, status: 'active' } });
  }

  isPdfReferenced(path: string) {
    return this.repository.exists({
      where: [{ exam_pdf_path: path }, { answer_key_pdf_path: path }],
    });
  }

  findActiveForUpdate(id: number, manager: EntityManager) {
    return manager.getRepository(MockExam).findOne({
      where: { id, status: 'active' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findByTeacher(teacherId: number, filters: QuestionFiltersDataDto) {
    const query = this.repository
      .createQueryBuilder('exam')
      .where('exam.teacher_id = :teacherId', { teacherId });
    this.applyCommonFilters(query, filters);
    if (filters.status)
      query.andWhere('exam.status = :status', { status: filters.status });
    if (filters.createdFrom)
      query.andWhere('exam.created_at >= :from', { from: filters.createdFrom });
    if (filters.createdToExclusive)
      query.andWhere('exam.created_at < :to', {
        to: filters.createdToExclusive,
      });
    return query
      .orderBy('exam.created_at', 'DESC')
      .addOrderBy('exam.id', 'DESC')
      .getMany();
  }

  private applyCommonFilters(
    query: SelectQueryBuilder<MockExam>,
    filters: Pick<QuestionFiltersDataDto, 'search' | 'examYear' | 'course'>,
    partialId = false,
  ) {
    if (filters.search) {
      const search = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
      query.andWhere(
        new Brackets((builder) => {
          if (partialId) {
            builder.where("CAST(exam.id AS CHAR) LIKE :search ESCAPE '\\\\'", {
              search,
            });
          } else {
            builder.where('CAST(exam.id AS CHAR) = :id', {
              id: filters.search,
            });
          }
          builder.orWhere("exam.title LIKE :search ESCAPE '\\\\'", { search });
        }),
      );
    }
    if (filters.course)
      query.andWhere('exam.course = :course', { course: filters.course });
    if (filters.examYear !== undefined)
      query.andWhere('exam.exam_year = :examYear', {
        examYear: filters.examYear,
      });
  }

  findOwned(id: number, teacherId: number, manager?: EntityManager) {
    const repository = manager?.getRepository(MockExam) ?? this.repository;
    return repository.findOne({
      where: { id, teacher_id: teacherId },
      ...(manager ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  save(data: Partial<MockExam>, manager: EntityManager) {
    const repository = manager.getRepository(MockExam);
    return repository.save(repository.create(data));
  }

  delete(id: number, teacherId: number, manager: EntityManager) {
    return manager
      .getRepository(MockExam)
      .delete({ id, teacher_id: teacherId });
  }
}
