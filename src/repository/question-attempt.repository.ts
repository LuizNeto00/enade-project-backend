import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { QuestionAttempt } from '../entities/question-attempt.entity';
import type { QuestionOptionLabel } from '../interfaces/question/question-types';
import type {
  QuestionAttemptStatistics,
  QuestionAlternativeStatistic,
} from '../interfaces/question/question-statistics.interface';

@Injectable()
export class QuestionAttemptRepository {
  constructor(
    @InjectRepository(QuestionAttempt)
    private readonly repository: Repository<QuestionAttempt>,
  ) {}

  save(
    attempt: Partial<QuestionAttempt>,
    manager: EntityManager,
  ): Promise<QuestionAttempt> {
    return manager
      .getRepository(QuestionAttempt)
      .save(manager.getRepository(QuestionAttempt).create(attempt));
  }

  async existsForQuestion(
    questionId: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repository = manager
      ? manager.getRepository(QuestionAttempt)
      : this.repository;
    return (
      (await repository.count({
        where: { question_id: questionId },
      })) > 0
    );
  }

  async detachFromQuestion(
    questionId: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(QuestionAttempt)
      .update({ question_id: questionId }, { question_id: null });
  }

  async getStatistics(
    questionId: number,
    optionCount: 4 | 5,
    correctOption: QuestionOptionLabel,
  ): Promise<QuestionAttemptStatistics> {
    const totalRow = await this.repository
      .createQueryBuilder('attempt')
      .select('COUNT(attempt.id)', 'totalAttempts')
      .addSelect('COUNT(DISTINCT attempt.student_id)', 'participantCount')
      .where('attempt.question_id = :questionId', { questionId })
      .getRawOne<{
        totalAttempts: string;
        participantCount: string;
      }>();

    const latest = await this.repository
      .createQueryBuilder('latest')
      .innerJoin(
        (subQuery) =>
          subQuery
            .select('MAX(attempt.id)', 'id')
            .from(QuestionAttempt, 'attempt')
            .where('attempt.question_id = :questionId', { questionId })
            .groupBy('attempt.student_id'),
        'recent',
        'recent.id = latest.id',
      )
      .select('latest.is_correct', 'isCorrect')
      .addSelect('latest.selected_option', 'selectedOption')
      .addSelect('COUNT(*)', 'count')
      .groupBy('latest.is_correct')
      .addGroupBy('latest.selected_option')
      .setParameter('questionId', questionId)
      .getRawMany<{
        isCorrect: number | string | null;
        selectedOption: QuestionOptionLabel;
        count: string;
      }>();

    const participantCount = Number(totalRow?.participantCount ?? 0);
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const choiceCounts = new Map<QuestionOptionLabel, number>();
    for (const row of latest) {
      const count = Number(row.count);
      choiceCounts.set(
        row.selectedOption,
        (choiceCounts.get(row.selectedOption) ?? 0) + count,
      );
      if (Number(row.isCorrect) === 1) correctAnswers += count;
      else incorrectAnswers += count;
    }

    const labels: QuestionOptionLabel[] =
      optionCount === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
    const alternatives: QuestionAlternativeStatistic[] = labels.map((label) => {
      const choiceCount = choiceCounts.get(label) ?? 0;
      return {
        label,
        count: choiceCount,
        percentage:
          participantCount === 0
            ? 0
            : Number(((choiceCount / participantCount) * 100).toFixed(2)),
        isCorrect: label === correctOption,
      };
    });

    return {
      participantCount,
      totalAttempts: Number(totalRow?.totalAttempts ?? 0),
      correctAnswers,
      incorrectAnswers,
      correctPercentage:
        participantCount === 0
          ? 0
          : Number(((correctAnswers / participantCount) * 100).toFixed(2)),
      incorrectPercentage:
        participantCount === 0
          ? 0
          : Number(((incorrectAnswers / participantCount) * 100).toFixed(2)),
      alternatives,
    };
  }
}
