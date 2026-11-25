jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { MockExamCompletionRepository } from '../repository/mock-exam-completion.repository';
import { MockExamRepository } from '../repository/mock-exam.repository';
import { MockExamResource } from '../resources/mock-exam/mock-exam.resource';
import { StudentMockExamService } from './student-mock-exam.service';

describe('StudentMockExamService', () => {
  const student = { id: 8, type_profile: 'student' } as User;
  const exam = { id: 3, title: 'Teste', status: 'active' };

  function setup() {
    const repository = {
      findActive: jest.fn().mockResolvedValue([exam]),
      findActiveById: jest.fn().mockResolvedValue(exam),
      findActiveForUpdate: jest.fn().mockResolvedValue(exam),
    };
    const completions = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = jest.fn(
      (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({} as EntityManager),
    );
    const service = new StudentMockExamService(
      repository as unknown as MockExamRepository,
      new MockExamResource(),
      completions as unknown as MockExamCompletionRepository,
      { transaction } as unknown as DataSource,
    );
    return { service, repository, completions };
  }

  it('normalizes and forwards the student filters to the active listing', async () => {
    const { service, repository } = setup();
    const result = await service.list(student, {
      search: '  física   aplicada ',
      examYear: 2024,
      course: 'Física',
    });
    expect(repository.findActive).toHaveBeenCalledWith({
      search: 'física aplicada',
      examYear: 2024,
      course: 'Física',
    });
    expect(result).toHaveLength(1);
    await expect(
      service.list({ id: 1, type_profile: 'teacher' } as User, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses answer keys until the student completes the exam', async () => {
    const { service, completions } = setup();
    await expect(service.findCompleted(3, student)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    completions.exists.mockResolvedValueOnce(true);
    await expect(service.findCompleted(3, student)).resolves.toEqual(exam);
  });

  it('does not release documents when the exam is inactive', async () => {
    const { service, repository } = setup();
    repository.findActiveById.mockResolvedValueOnce(null);
    await expect(service.findCompleted(3, student)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('registers completion once and refuses inactive exams', async () => {
    const { service, repository, completions } = setup();
    await service.complete(3, student);
    expect(completions.create).toHaveBeenCalledTimes(1);
    completions.exists.mockResolvedValueOnce(true);
    await service.complete(3, student);
    expect(completions.create).toHaveBeenCalledTimes(1);
    repository.findActiveForUpdate.mockResolvedValueOnce(null);
    await expect(service.complete(3, student)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
