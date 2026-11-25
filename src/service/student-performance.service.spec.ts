jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (value: string) =>
    value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''),
}));

import { ForbiddenException } from '@nestjs/common';
import type { User } from '../entities/user.entity';
import { FilterPerformanceRequest } from '../request/student-performance/filter-performance.request';
import { StudentPerformanceRepository } from '../repository/student-performance.repository';
import { StudentPerformanceResource } from '../resources/student-performance/student-performance.resource';
import { StudentPerformanceService } from './student-performance.service';

describe('StudentPerformanceService', () => {
  it('uses the authenticated student and applies period filters', async () => {
    const repository = {
      getSummary: jest.fn().mockResolvedValue({
        totalAttempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        distinctQuestions: 0,
        correctPercentage: 0,
        incorrectPercentage: 0,
        evolution: [],
      }),
      getAttemptsPage: jest.fn().mockResolvedValue({
        items: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      }),
    };
    const resource = {
      toSummary: jest.fn((value: unknown) => value),
      toAttemptsPage: jest.fn((value: unknown) => value),
    };
    const service = new StudentPerformanceService(
      repository as unknown as StudentPerformanceRepository,
      resource as unknown as StudentPerformanceResource,
    );

    await service.getSummary(
      { id: 7, type_profile: 'student' } as User,
      Object.assign(new FilterPerformanceRequest(), {
        answeredFrom: '2026-11-01',
      }),
    );
    expect(repository.getSummary).toHaveBeenCalledTimes(1);
  });

  it('rejects a teacher requesting student performance', async () => {
    const service = new StudentPerformanceService(
      {} as StudentPerformanceRepository,
      {} as StudentPerformanceResource,
    );
    await expect(
      service.getSummary(
        { id: 7, type_profile: 'teacher' } as User,
        new FilterPerformanceRequest(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
