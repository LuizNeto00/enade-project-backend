import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Question } from '../entities/question.entity';
import { QuestionAttempt } from '../entities/question-attempt.entity';
import { QuestionComment } from '../entities/question-comment.entity';
import type {
  TeacherDashboardActivityPoint,
  TeacherDashboardQuestionPerformance,
  TeacherDashboardSummary,
} from '../interfaces/teacher-dashboard/teacher-dashboard.interface';

interface QuestionSummaryRow {
  totalQuestions: string;
  activeQuestions: string;
  questionsCreatedInPeriod: string;
}

interface AnswerSummaryRow {
  totalAnswers: string;
  correctAnswers: string;
  incorrectAnswers: string;
  uniqueStudents: string;
  questionsAnswered: string;
}

interface QuestionPerformanceRow {
  id: string | number;
  statementPreview: string;
  course: string;
  examYear: string | number;
  totalAnswers: string;
  correctAnswers: string;
  incorrectAnswers: string;
  accuracyRate: string;
  errorRate: string;
}

@Injectable()
export class TeacherDashboardRepository {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionAttempt)
    private readonly attemptRepository: Repository<QuestionAttempt>,
    @InjectRepository(QuestionComment)
    private readonly commentRepository: Repository<QuestionComment>,
  ) {}

  async getQuestionSummary(
    teacherId: number,
    from: Date,
    toExclusive: Date,
  ): Promise<
    Pick<
      TeacherDashboardSummary,
      'totalQuestions' | 'activeQuestions' | 'questionsCreatedInPeriod'
    >
  > {
    const row = await this.questionRepository
      .createQueryBuilder('question')
      .select('COUNT(question.id)', 'totalQuestions')
      .addSelect(
        'SUM(CASE WHEN question.status = :activeStatus THEN 1 ELSE 0 END)',
        'activeQuestions',
      )
      .addSelect(
        'SUM(CASE WHEN question.created_at >= :from AND question.created_at < :toExclusive THEN 1 ELSE 0 END)',
        'questionsCreatedInPeriod',
      )
      .where('question.teacher_id = :teacherId', { teacherId })
      .setParameters({ activeStatus: 'active', from, toExclusive })
      .getRawOne<QuestionSummaryRow>();

    return {
      totalQuestions: Number(row?.totalQuestions ?? 0),
      activeQuestions: Number(row?.activeQuestions ?? 0),
      questionsCreatedInPeriod: Number(row?.questionsCreatedInPeriod ?? 0),
    };
  }

  async getAnswerSummary(
    teacherId: number,
    from: Date,
    toExclusive: Date,
  ): Promise<
    Pick<
      TeacherDashboardSummary,
      | 'totalAnswers'
      | 'correctAnswers'
      | 'incorrectAnswers'
      | 'uniqueStudents'
      | 'questionsAnswered'
    >
  > {
    const query = this.applyAnswerPeriod(
      this.attemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.question', 'question')
        .select('COUNT(attempt.id)', 'totalAnswers')
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 1 THEN 1 ELSE 0 END)',
          'correctAnswers',
        )
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 0 THEN 1 ELSE 0 END)',
          'incorrectAnswers',
        )
        .addSelect('COUNT(DISTINCT attempt.student_id)', 'uniqueStudents')
        .addSelect('COUNT(DISTINCT question.id)', 'questionsAnswered'),
      teacherId,
      from,
      toExclusive,
    );
    const row = await query.getRawOne<AnswerSummaryRow>();

    return {
      totalAnswers: Number(row?.totalAnswers ?? 0),
      correctAnswers: Number(row?.correctAnswers ?? 0),
      incorrectAnswers: Number(row?.incorrectAnswers ?? 0),
      uniqueStudents: Number(row?.uniqueStudents ?? 0),
      questionsAnswered: Number(row?.questionsAnswered ?? 0),
    };
  }

  async getActivity(
    teacherId: number,
    from: Date,
    toExclusive: Date,
    granularity: 'day' | 'month',
  ): Promise<TeacherDashboardActivityPoint[]> {
    const bucket =
      granularity === 'day'
        ? 'DATE(attempt.answered_at)'
        : "DATE_FORMAT(attempt.answered_at, '%Y-%m-01')";
    const rows = await this.applyAnswerPeriod(
      this.attemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.question', 'question')
        .select(bucket, 'date')
        .addSelect('COUNT(attempt.id)', 'totalAnswers')
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 1 THEN 1 ELSE 0 END)',
          'correctAnswers',
        )
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 0 THEN 1 ELSE 0 END)',
          'incorrectAnswers',
        )
        .groupBy(bucket)
        .orderBy(bucket, 'ASC'),
      teacherId,
      from,
      toExclusive,
    ).getRawMany<{
      date: string | Date;
      totalAnswers: string;
      correctAnswers: string;
      incorrectAnswers: string;
    }>();

    return rows.map((row) => ({
      date:
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date).slice(0, 10),
      totalAnswers: Number(row.totalAnswers),
      correctAnswers: Number(row.correctAnswers),
      incorrectAnswers: Number(row.incorrectAnswers),
    }));
  }

  async getQuestionRankings(
    teacherId: number,
    from: Date,
    toExclusive: Date,
    minimumAnswers: number,
    limit = 5,
  ): Promise<{
    mostDifficultQuestions: TeacherDashboardQuestionPerformance[];
    bestPerformingQuestions: TeacherDashboardQuestionPerformance[];
  }> {
    const aggregate = this.applyAnswerPeriod(
      this.attemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.question', 'question')
        .select('question.id', 'id')
        .addSelect('SUBSTRING(question.statement, 1, 320)', 'statementPreview')
        .addSelect('question.course', 'course')
        .addSelect('question.exam_year', 'examYear')
        .addSelect('COUNT(attempt.id)', 'totalAnswers')
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 1 THEN 1 ELSE 0 END)',
          'correctAnswers',
        )
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 0 THEN 1 ELSE 0 END)',
          'incorrectAnswers',
        )
        .addSelect(
          'ROUND(100 * SUM(CASE WHEN attempt.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(attempt.id), 1)',
          'accuracyRate',
        )
        .addSelect(
          'ROUND(100 * SUM(CASE WHEN attempt.is_correct = 0 THEN 1 ELSE 0 END) / COUNT(attempt.id), 1)',
          'errorRate',
        )
        .groupBy('question.id')
        .having('COUNT(attempt.id) >= :minimumAnswers', { minimumAnswers }),
      teacherId,
      from,
      toExclusive,
    );

    const mostDifficultRows = await aggregate
      .clone()
      .orderBy('errorRate', 'DESC')
      .addOrderBy('totalAnswers', 'DESC')
      .take(limit)
      .getRawMany<QuestionPerformanceRow>();
    const bestPerformingRows = await aggregate
      .clone()
      .orderBy('accuracyRate', 'DESC')
      .addOrderBy('totalAnswers', 'DESC')
      .take(limit)
      .getRawMany<QuestionPerformanceRow>();

    return {
      mostDifficultQuestions: mostDifficultRows.map((row) =>
        this.toQuestionPerformance(row),
      ),
      bestPerformingQuestions: bestPerformingRows.map((row) =>
        this.toQuestionPerformance(row),
      ),
    };
  }

  async getDiscussionSummary(
    teacherId: number,
    from: Date,
    toExclusive: Date,
  ): Promise<
    Pick<TeacherDashboardSummary, 'publishedComments' | 'discussionReplies'>
  > {
    const row = await this.commentRepository
      .createQueryBuilder('comment')
      .innerJoin('comment.question', 'question')
      .select('COUNT(comment.id)', 'publishedComments')
      .addSelect(
        'SUM(CASE WHEN comment.parent_id IS NOT NULL THEN 1 ELSE 0 END)',
        'discussionReplies',
      )
      .where('question.teacher_id = :teacherId', { teacherId })
      .andWhere('comment.deleted_at IS NULL')
      .andWhere('comment.created_at >= :from', { from })
      .andWhere('comment.created_at < :toExclusive', { toExclusive })
      .getRawOne<{ publishedComments: string; discussionReplies: string }>();

    return {
      publishedComments: Number(row?.publishedComments ?? 0),
      discussionReplies: Number(row?.discussionReplies ?? 0),
    };
  }

  private applyAnswerPeriod<T extends QuestionAttempt>(
    query: SelectQueryBuilder<T>,
    teacherId: number,
    from: Date,
    toExclusive: Date,
  ): SelectQueryBuilder<T> {
    return query
      .where('question.teacher_id = :teacherId', { teacherId })
      .andWhere('attempt.answered_at >= :from', { from })
      .andWhere('attempt.answered_at < :toExclusive', { toExclusive });
  }

  private toQuestionPerformance(
    row: QuestionPerformanceRow,
  ): TeacherDashboardQuestionPerformance {
    return {
      id: String(row.id),
      statementPreview: row.statementPreview,
      course: row.course,
      examYear: Number(row.examYear),
      totalAnswers: Number(row.totalAnswers),
      correctAnswers: Number(row.correctAnswers),
      incorrectAnswers: Number(row.incorrectAnswers),
      accuracyRate: Number(row.accuracyRate),
      errorRate: Number(row.errorRate),
    };
  }
}
