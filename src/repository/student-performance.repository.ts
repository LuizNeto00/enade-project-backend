import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { QuestionAttempt } from '../entities/question-attempt.entity';
import { StudentPerformanceFiltersDto } from '../dto/student-performance/student-performance-filters.dto';
import type {
  PerformanceEvolutionPoint,
  StudentPerformanceAttempt,
  StudentPerformanceAttemptsPage,
  StudentPerformanceSummary,
} from '../interfaces/student-performance/student-performance.interface';
import type { QuestionOptionLabel } from '../interfaces/question/question-types';

@Injectable()
export class StudentPerformanceRepository {
  constructor(
    @InjectRepository(QuestionAttempt)
    private readonly repository: Repository<QuestionAttempt>,
  ) {}

  private applyPeriod(
    query: SelectQueryBuilder<QuestionAttempt>,
    studentId: number,
    filters: StudentPerformanceFiltersDto,
  ): SelectQueryBuilder<QuestionAttempt> {
    query
      .where('attempt.student_id = :studentId', { studentId })
      .andWhere('attempt.answered_at IS NOT NULL');
    if (filters.answeredFrom) {
      query.andWhere('attempt.answered_at >= :answeredFrom', {
        answeredFrom: filters.answeredFrom,
      });
    }
    if (filters.answeredToExclusive) {
      query.andWhere('attempt.answered_at < :answeredToExclusive', {
        answeredToExclusive: filters.answeredToExclusive,
      });
    }
    return query;
  }

  async getSummary(
    studentId: number,
    filters: StudentPerformanceFiltersDto,
  ): Promise<
    StudentPerformanceSummary & {
      evolution: PerformanceEvolutionPoint[];
    }
  > {
    const summaryQuery = this.applyPeriod(
      this.repository
        .createQueryBuilder('attempt')
        .select('COUNT(attempt.id)', 'totalAttempts')
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 1 THEN 1 ELSE 0 END)',
          'correctAttempts',
        )
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 0 THEN 1 ELSE 0 END)',
          'incorrectAttempts',
        )
        .addSelect(
          'COUNT(DISTINCT COALESCE(attempt.question_id, CAST(JSON_UNQUOTE(JSON_EXTRACT(attempt.question_snapshot, "$.id")) AS UNSIGNED), -attempt.id))',
          'distinctQuestions',
        ),
      studentId,
      filters,
    );

    const summary = await summaryQuery.getRawOne<{
      totalAttempts: string;
      correctAttempts: string;
      incorrectAttempts: string;
      distinctQuestions: string;
    }>();
    const totalAttempts = Number(summary?.totalAttempts ?? 0);
    const correctAttempts = Number(summary?.correctAttempts ?? 0);
    const incorrectAttempts = Number(summary?.incorrectAttempts ?? 0);
    const distinctQuestions = Number(summary?.distinctQuestions ?? 0);

    const evolutionQuery = this.applyPeriod(
      this.repository
        .createQueryBuilder('attempt')
        .select('DATE(attempt.answered_at)', 'date')
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 1 THEN 1 ELSE 0 END)',
          'correct',
        )
        .addSelect(
          'SUM(CASE WHEN attempt.is_correct = 0 THEN 1 ELSE 0 END)',
          'incorrect',
        )
        .groupBy('DATE(attempt.answered_at)')
        .orderBy('DATE(attempt.answered_at)', 'ASC'),
      studentId,
      filters,
    );
    const evolutionRows = await evolutionQuery.getRawMany<{
      date: string | Date;
      correct: string;
      incorrect: string;
    }>();
    const evolution = evolutionRows.map((row) => {
      const correct = Number(row.correct);
      const incorrect = Number(row.incorrect);
      const total = correct + incorrect;
      return {
        date:
          row.date instanceof Date
            ? row.date.toISOString().slice(0, 10)
            : String(row.date).slice(0, 10),
        correct,
        incorrect,
        accuracyPercentage:
          total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2)),
      };
    });

    return {
      totalAttempts,
      correctAttempts,
      incorrectAttempts,
      distinctQuestions,
      correctPercentage:
        totalAttempts === 0
          ? 0
          : Number(((correctAttempts / totalAttempts) * 100).toFixed(2)),
      incorrectPercentage:
        totalAttempts === 0
          ? 0
          : Number(((incorrectAttempts / totalAttempts) * 100).toFixed(2)),
      evolution,
    };
  }

  async getAttemptsPage(
    studentId: number,
    filters: StudentPerformanceFiltersDto,
  ): Promise<StudentPerformanceAttemptsPage> {
    const baseQuery = this.applyPeriod(
      this.repository
        .createQueryBuilder('attempt')
        .leftJoinAndSelect('attempt.question', 'question'),
      studentId,
      filters,
    );

    const total = await baseQuery.getCount();
    const attempts = await baseQuery
      .orderBy('attempt.answered_at', 'DESC')
      .addOrderBy('attempt.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getMany();

    return {
      items: attempts.map((attempt) => this.toAttempt(attempt)),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
    };
  }

  async getAttempt(
    studentId: number,
    attemptId: number,
  ): Promise<StudentPerformanceAttempt | null> {
    const attempt = await this.repository.findOne({
      where: { id: attemptId, student_id: studentId },
      relations: { question: true },
    });
    return attempt ? this.toAttempt(attempt) : null;
  }

  private toAttempt(attempt: QuestionAttempt): StudentPerformanceAttempt {
    const snapshot = this.parseSnapshot(attempt.question_snapshot);
    const question = attempt.question;
    const statement =
      snapshot?.statement ?? question?.statement ?? 'Questão removida.';
    const course =
      snapshot?.course ?? question?.course ?? 'Curso não disponível';
    const examYear = snapshot?.examYear ?? question?.exam_year ?? null;
    const level = snapshot?.level ?? question?.level ?? null;
    const optionCount = snapshot?.optionCount ?? question?.option_count ?? 4;
    const options =
      snapshot?.options ?? this.optionsFromQuestion(question, optionCount);
    const correctOption =
      attempt.correct_option ??
      snapshot?.correctOption ??
      question?.correct_option ??
      'A';
    const answerComment =
      snapshot?.answerComment ?? question?.answer_comment ?? '';

    return {
      id: String(attempt.id),
      questionId:
        attempt.question_id === null
          ? snapshot?.id != null
            ? String(snapshot.id)
            : null
          : String(attempt.question_id),
      statement,
      course,
      examYear,
      level,
      optionCount: optionCount === 5 ? 5 : 4,
      options,
      selectedOption: attempt.selected_option,
      correctOption,
      isCorrect: Boolean(attempt.is_correct),
      answerComment,
      answeredAt: attempt.answered_at.toISOString(),
      questionAvailable: Boolean(question),
      questionActive: question ? question.status === 'active' : null,
    };
  }

  private parseSnapshot(value: string | null): SnapshotData | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as SnapshotData;
    } catch {
      return null;
    }
  }

  private optionsFromQuestion(
    question: QuestionSnapshotFallback | undefined,
    optionCount: 4 | 5,
  ): Array<{ label: QuestionOptionLabel; text: string }> {
    if (!question) return [];
    const options: Array<{ label: QuestionOptionLabel; text: string }> = [
      { label: 'A', text: question.option_a },
      { label: 'B', text: question.option_b },
      { label: 'C', text: question.option_c },
      { label: 'D', text: question.option_d },
    ];
    if (optionCount === 5 && question.option_e) {
      options.push({ label: 'E', text: question.option_e });
    }
    return options;
  }
}

interface SnapshotData {
  id?: number;
  statement: string;
  course: string;
  examYear: number;
  level: 'easy' | 'medium' | 'hard';
  optionCount: 4 | 5;
  options: Array<{ label: QuestionOptionLabel; text: string }>;
  correctOption: QuestionOptionLabel;
  answerComment: string;
}

interface QuestionSnapshotFallback {
  statement: string;
  course: string;
  exam_year: number;
  level: 'easy' | 'medium' | 'hard';
  option_count: 4 | 5;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string | null;
  status: 'active' | 'inactive';
  correct_option: QuestionOptionLabel;
  answer_comment: string;
}
