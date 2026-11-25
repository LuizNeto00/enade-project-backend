import type { QuestionOptionLabel } from './question-types';

export interface QuestionAlternativeStatistic {
  label: QuestionOptionLabel;
  count: number;
  percentage: number;
  isCorrect: boolean;
}

export interface QuestionAttemptStatistics {
  participantCount: number;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  correctPercentage: number;
  incorrectPercentage: number;
  alternatives: QuestionAlternativeStatistic[];
}

export interface QuestionStatisticsResponse {
  question: {
    id: string;
    course: string;
    examYear: number;
    level: 'Fácil' | 'Médio' | 'Difícil';
    status: 'active' | 'inactive';
    statement: string;
  };
  participantCount: number;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  correctPercentage: number;
  incorrectPercentage: number;
  alternatives: QuestionAlternativeStatistic[];
}
