jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../entities/user.entity';
import { TeacherDashboardRequest } from '../request/teacher-dashboard/teacher-dashboard.request';
import { TeacherDashboardRepository } from '../repository/teacher-dashboard.repository';
import { TeacherDashboardService } from './teacher-dashboard.service';

describe('TeacherDashboardService', () => {
  let service: TeacherDashboardService;
  let repository: {
    getQuestionSummary: jest.Mock;
    getAnswerSummary: jest.Mock;
    getDiscussionSummary: jest.Mock;
    getActivity: jest.Mock;
    getQuestionRankings: jest.Mock;
  };
  let module: TestingModule;

  beforeEach(async () => {
    repository = {
      getQuestionSummary: jest.fn().mockResolvedValue({
        totalQuestions: 4,
        activeQuestions: 3,
        questionsCreatedInPeriod: 2,
      }),
      getAnswerSummary: jest.fn().mockResolvedValue({
        totalAnswers: 6,
        correctAnswers: 4,
        incorrectAnswers: 2,
        uniqueStudents: 3,
        questionsAnswered: 2,
      }),
      getDiscussionSummary: jest.fn().mockResolvedValue({
        publishedComments: 5,
        discussionReplies: 2,
      }),
      getActivity: jest.fn().mockResolvedValue([]),
      getQuestionRankings: jest.fn().mockResolvedValue({
        mostDifficultQuestions: [],
        bestPerformingQuestions: [],
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        TeacherDashboardService,
        { provide: TeacherDashboardRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(TeacherDashboardService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('aggregates teacher indicators for the inclusive requested date range', async () => {
    const user = Object.assign(new User(), { id: 17, type_profile: 'teacher' });
    const request = Object.assign(new TeacherDashboardRequest(), {
      from: '2026-03-01',
      to: '2026-03-07',
    });

    const result = await service.getDashboard(user, request);

    expect(repository.getAnswerSummary).toHaveBeenCalledWith(
      17,
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-08T00:00:00.000Z'),
    );
    expect(result.period).toEqual({
      from: '2026-03-01',
      to: '2026-03-07',
      granularity: 'day',
    });
    expect(result.summary).toMatchObject({
      totalQuestions: 4,
      activeQuestions: 3,
      inactiveQuestions: 1,
      questionsCreatedInPeriod: 2,
      totalAnswers: 6,
      correctAnswers: 4,
      incorrectAnswers: 2,
      uniqueStudents: 3,
      accuracyRate: 66.7,
      errorRate: 33.3,
      publishedComments: 5,
      discussionReplies: 2,
    });
    expect(result.minimumRankingAnswers).toBe(5);
  });

  it('does not calculate an accuracy percentage when there are no answers', async () => {
    repository.getAnswerSummary.mockResolvedValue({
      totalAnswers: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      uniqueStudents: 0,
      questionsAnswered: 0,
    });
    const user = Object.assign(new User(), { id: 17, type_profile: 'teacher' });

    const result = await service.getDashboard(
      user,
      Object.assign(new TeacherDashboardRequest(), {
        from: '2026-01-01',
        to: '2026-01-01',
      }),
    );

    expect(result.summary.accuracyRate).toBe(0);
    expect(result.summary.errorRate).toBe(0);
  });

  it('forbids students from viewing teacher dashboard data', async () => {
    const user = Object.assign(new User(), { id: 23, type_profile: 'student' });

    await expect(
      service.getDashboard(user, new TeacherDashboardRequest()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.getAnswerSummary).not.toHaveBeenCalled();
  });

  it('rejects a partial or inverted period', async () => {
    const user = Object.assign(new User(), { id: 17, type_profile: 'teacher' });

    await expect(
      service.getDashboard(
        user,
        Object.assign(new TeacherDashboardRequest(), { from: '2026-03-01' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getDashboard(
        user,
        Object.assign(new TeacherDashboardRequest(), {
          from: '2026-03-08',
          to: '2026-03-01',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
