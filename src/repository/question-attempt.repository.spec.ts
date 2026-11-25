jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { QuestionAttemptRepository } from './question-attempt.repository';

describe('QuestionAttemptRepository.getStatistics', () => {
  it('calculates unique latest participants and all available alternatives', async () => {
    const totalQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        totalAttempts: '5',
        participantCount: '3',
      }),
    };
    const latestQuery = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { isCorrect: 1, selectedOption: 'C', count: '2' },
        { isCorrect: 0, selectedOption: 'A', count: '1' },
      ]),
    };
    const repository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(totalQuery)
        .mockReturnValueOnce(latestQuery),
    };
    const service = new QuestionAttemptRepository(repository as never);

    await expect(service.getStatistics(12, 4, 'C')).resolves.toEqual({
      participantCount: 3,
      totalAttempts: 5,
      correctAnswers: 2,
      incorrectAnswers: 1,
      correctPercentage: 66.67,
      incorrectPercentage: 33.33,
      alternatives: [
        { label: 'A', count: 1, percentage: 33.33, isCorrect: false },
        { label: 'B', count: 0, percentage: 0, isCorrect: false },
        { label: 'C', count: 2, percentage: 66.67, isCorrect: true },
        { label: 'D', count: 0, percentage: 0, isCorrect: false },
      ],
    });
  });

  it('returns zeroed metrics and excludes E for a four-option question', async () => {
    const totalQuery = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        totalAttempts: '0',
        participantCount: '0',
      }),
    };
    const latestQuery = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    const repository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(totalQuery)
        .mockReturnValueOnce(latestQuery),
    };
    const service = new QuestionAttemptRepository(repository as never);

    const result = await service.getStatistics(12, 4, 'A');

    expect(result.participantCount).toBe(0);
    expect(result.totalAttempts).toBe(0);
    expect(result.alternatives.map((item) => item.label)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });
});
