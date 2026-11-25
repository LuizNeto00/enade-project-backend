import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MockExamCompletion } from '../entities/mock-exam-completion.entity';

@Injectable()
export class MockExamCompletionRepository {
  constructor(
    @InjectRepository(MockExamCompletion)
    private readonly repository: Repository<MockExamCompletion>,
  ) {}

  exists(mockExamId: number, studentId: number, manager?: EntityManager) {
    return (
      manager?.getRepository(MockExamCompletion) ?? this.repository
    ).exists({
      where: { mock_exam_id: mockExamId, student_id: studentId },
    });
  }

  async create(mockExamId: number, studentId: number, manager: EntityManager) {
    await manager.getRepository(MockExamCompletion).insert({
      mock_exam_id: mockExamId,
      student_id: studentId,
    });
  }
}
