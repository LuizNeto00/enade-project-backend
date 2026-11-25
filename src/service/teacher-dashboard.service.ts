import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import type {
  TeacherDashboardData,
  TeacherDashboardDateRange,
  TeacherDashboardSummary,
} from '../interfaces/teacher-dashboard/teacher-dashboard.interface';
import { TeacherDashboardRequest } from '../request/teacher-dashboard/teacher-dashboard.request';
import { TeacherDashboardRepository } from '../repository/teacher-dashboard.repository';

const MINIMUM_RANKING_ANSWERS = 5;

@Injectable()
export class TeacherDashboardService {
  constructor(private readonly repository: TeacherDashboardRepository) {}

  async getDashboard(
    user: User,
    request: TeacherDashboardRequest,
  ): Promise<TeacherDashboardData> {
    this.assertTeacher(user);

    const period = this.getDateRange(request);
    const from = this.toUtcDate(period.from);
    const toExclusive = this.toUtcDate(this.addDays(period.to, 1));
    const granularity = this.getGranularity(period.from, period.to);

    const [
      questionSummary,
      answerSummary,
      discussionSummary,
      activity,
      rankings,
    ] = await Promise.all([
      this.repository.getQuestionSummary(user.id, from, toExclusive),
      this.repository.getAnswerSummary(user.id, from, toExclusive),
      this.repository.getDiscussionSummary(user.id, from, toExclusive),
      this.repository.getActivity(user.id, from, toExclusive, granularity),
      this.repository.getQuestionRankings(
        user.id,
        from,
        toExclusive,
        MINIMUM_RANKING_ANSWERS,
      ),
    ]);

    const summary: TeacherDashboardSummary = {
      ...questionSummary,
      inactiveQuestions:
        questionSummary.totalQuestions - questionSummary.activeQuestions,
      ...answerSummary,
      accuracyRate: this.getRate(
        answerSummary.correctAnswers,
        answerSummary.totalAnswers,
      ),
      errorRate: this.getRate(
        answerSummary.incorrectAnswers,
        answerSummary.totalAnswers,
      ),
      ...discussionSummary,
    };

    return {
      period: { ...period, granularity },
      summary,
      activity,
      ...rankings,
      minimumRankingAnswers: MINIMUM_RANKING_ANSWERS,
    };
  }

  private assertTeacher(user: User): void {
    if (user.type_profile !== 'teacher') {
      throw new ForbiddenException(
        'Somente professores podem consultar o painel pedagógico.',
      );
    }
  }

  private getDateRange(
    request: TeacherDashboardRequest,
  ): Pick<TeacherDashboardDateRange, 'from' | 'to'> {
    const today = new Date().toISOString().slice(0, 10);
    const from = request.from ?? this.addDays(today, -29);
    const to = request.to ?? today;

    if (Boolean(request.from) !== Boolean(request.to) || from > to) {
      throw new BadRequestException('Informe um período de datas válido.');
    }

    return { from, to };
  }

  private getGranularity(from: string, to: string): 'day' | 'month' {
    const durationDays =
      (this.toUtcDate(to).getTime() - this.toUtcDate(from).getTime()) /
      (24 * 60 * 60 * 1000);
    return durationDays <= 90 ? 'day' : 'month';
  }

  private getRate(count: number, total: number): number {
    return total === 0 ? 0 : Number(((count / total) * 100).toFixed(1));
  }

  private toUtcDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private addDays(date: string, days: number): string {
    const result = this.toUtcDate(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result.toISOString().slice(0, 10);
  }
}
