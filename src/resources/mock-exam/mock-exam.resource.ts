import { Injectable } from '@nestjs/common';
import { MockExam } from '../../entities/mock-exam.entity';

@Injectable()
export class MockExamResource {
  student(exam: MockExam) {
    return {
      id: exam.id,
      title: exam.title,
      course: exam.course,
      examYear: exam.exam_year,
      createdAt: exam.created_at,
    };
  }

  teacher(exam: MockExam) {
    return {
      id: exam.id,
      title: exam.title,
      course: exam.course,
      examYear: exam.exam_year,
      status: exam.status,
      examPdfName: exam.exam_pdf_name,
      answerKeyPdfName: exam.answer_key_pdf_name,
      createdAt: exam.created_at,
      updatedAt: exam.updated_at,
    };
  }
}
