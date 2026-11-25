import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { MockExam } from '../entities/mock-exam.entity';
import { MockExamFiles } from '../interfaces/mock-exam/mock-exam-files.interface';
import { CreateMockExamRequest } from '../request/mock-exam/create-mock-exam.request';
import { UpdateMockExamRequest } from '../request/mock-exam/update-mock-exam.request';
import { FilterMockExamsRequest } from '../request/mock-exam/filter-mock-exams.request';
import { prepareQuestionFilters } from '../helper/question/question-filters.helper';
import { MockExamRepository } from '../repository/mock-exam.repository';
import { MockExamResource } from '../resources/mock-exam/mock-exam.resource';
import { getMaxPdfSize, PdfStorageService } from './pdf-storage.service';

@Injectable()
export class MockExamService {
  private readonly logger = new Logger(MockExamService.name);

  constructor(
    private readonly repository: MockExamRepository,
    private readonly storage: PdfStorageService,
    private readonly resource: MockExamResource,
    private readonly dataSource: DataSource,
  ) {}

  uploadConfig(teacher: User) {
    this.assertTeacher(teacher);
    return { maxPdfSizeBytes: getMaxPdfSize() };
  }

  async list(teacher: User, filters: FilterMockExamsRequest) {
    this.assertTeacher(teacher);
    const exams = await this.repository.findByTeacher(
      teacher.id,
      prepareQuestionFilters(filters),
    );
    return exams.map((exam) => this.resource.teacher(exam));
  }

  async details(id: number, teacher: User) {
    return this.resource.teacher(await this.findOwned(id, teacher));
  }

  async findOwned(id: number, teacher: User): Promise<MockExam> {
    this.assertTeacher(teacher);
    const exam = await this.repository.findOwned(id, teacher.id);
    if (!exam) throw new NotFoundException('Simulado não encontrado.');
    return exam;
  }

  async create(
    request: CreateMockExamRequest,
    files: MockExamFiles,
    teacher: User,
  ) {
    this.assertTeacher(teacher);
    const examPdf = files.examPdf?.[0];
    const answerKeyPdf = files.answerKeyPdf?.[0];
    if (!examPdf || !answerKeyPdf)
      throw new BadRequestException('Envie os PDFs da prova e do gabarito.');
    await this.storage.validate(examPdf);
    await this.storage.validate(answerKeyPdf);
    const created: string[] = [];
    let saved: MockExam;
    try {
      const examPath = await this.storage.store(examPdf);
      created.push(examPath);
      const keyPath = await this.storage.store(answerKeyPdf);
      created.push(keyPath);
      saved = await this.dataSource.transaction((manager) =>
        this.repository.save(
          {
            teacher_id: teacher.id,
            title: request.title,
            course: request.course,
            exam_year: Number(request.examYear),
            status: request.status,
            exam_pdf_path: examPath,
            exam_pdf_name: examPdf.originalname,
            answer_key_pdf_path: keyPath,
            answer_key_pdf_name: answerKeyPdf.originalname,
          },
          manager,
        ),
      );
    } catch (error) {
      await this.clean(created);
      throw error;
    }
    return this.resource.teacher(saved);
  }

  async update(
    id: number,
    request: UpdateMockExamRequest,
    files: MockExamFiles,
    teacher: User,
  ) {
    await this.findOwned(id, teacher);
    const examPdf = files.examPdf?.[0];
    const answerKeyPdf = files.answerKeyPdf?.[0];
    if (examPdf) await this.storage.validate(examPdf);
    if (answerKeyPdf) await this.storage.validate(answerKeyPdf);
    const created: string[] = [];
    let result: { exam: MockExam; removed: string[] };
    try {
      const examPath = examPdf ? await this.storage.store(examPdf) : undefined;
      if (examPath) created.push(examPath);
      const keyPath = answerKeyPdf
        ? await this.storage.store(answerKeyPdf)
        : undefined;
      if (keyPath) created.push(keyPath);
      result = await this.dataSource.transaction(async (manager) => {
        const exam = await this.repository.findOwned(id, teacher.id, manager);
        if (!exam) throw new NotFoundException('Simulado não encontrado.');
        const removed: string[] = [];
        if (request.title !== undefined) exam.title = request.title;
        if (request.course !== undefined) exam.course = request.course;
        if (request.examYear !== undefined)
          exam.exam_year = Number(request.examYear);
        if (request.status !== undefined) exam.status = request.status;
        if (examPath && examPdf) {
          removed.push(exam.exam_pdf_path);
          exam.exam_pdf_path = examPath;
          exam.exam_pdf_name = examPdf.originalname;
        }
        if (keyPath && answerKeyPdf) {
          removed.push(exam.answer_key_pdf_path);
          exam.answer_key_pdf_path = keyPath;
          exam.answer_key_pdf_name = answerKeyPdf.originalname;
        }
        return { exam: await this.repository.save(exam, manager), removed };
      });
    } catch (error) {
      await this.clean(created);
      throw error;
    }
    await this.clean(result.removed);
    return this.resource.teacher(result.exam);
  }

  async delete(id: number, teacher: User) {
    this.assertTeacher(teacher);
    const paths = await this.dataSource.transaction(async (manager) => {
      const exam = await this.repository.findOwned(id, teacher.id, manager);
      if (!exam) throw new NotFoundException('Simulado não encontrado.');
      const deleted = await this.repository.delete(id, teacher.id, manager);
      if (deleted.affected !== 1)
        throw new NotFoundException('Simulado não encontrado.');
      return [exam.exam_pdf_path, exam.answer_key_pdf_path];
    });
    await this.clean(paths);
  }

  private assertTeacher(user: User) {
    if (user.type_profile !== 'teacher')
      throw new ForbiddenException('Acesso permitido somente a professores.');
  }

  private async clean(paths: string[]) {
    for (const path of paths) {
      try {
        if (!(await this.repository.isPdfReferenced(path))) {
          await this.storage.remove(path);
        }
      } catch (error) {
        this.logger.error(
          'Não foi possível verificar ou remover um PDF de simulado.',
          error,
        );
      }
    }
  }
}
