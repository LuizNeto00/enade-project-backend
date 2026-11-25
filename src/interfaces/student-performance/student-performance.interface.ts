import type { QuestionOptionLabel } from '../question/question-types';

export interface PerformanceEvolutionPoint {
  date: string;
  correct: number;
  incorrect: number;
  accuracyPercentage: number;
}

export interface StudentPerformanceSummary {
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  distinctQuestions: number;
  correctPercentage: number;
  incorrectPercentage: number;
  evolution: PerformanceEvolutionPoint[];
}

export interface StudentPerformanceAttempt {
  id: string;
  questionId: string | null;
  statement: string;
  course: string;
  examYear: number | null;
  level: 'easy' | 'medium' | 'hard' | null;
  optionCount: 4 | 5;
  options: Array<{ label: QuestionOptionLabel; text: string }>;
  selectedOption: QuestionOptionLabel;
  correctOption: QuestionOptionLabel;
  isCorrect: boolean;
  answerComment: string;
  answeredAt: string;
  questionAvailable: boolean;
  questionActive: boolean | null;
}

export interface StudentPerformanceAttemptsPage {
  items: StudentPerformanceAttempt[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
