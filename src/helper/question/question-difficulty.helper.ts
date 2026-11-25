import { QuestionDifficulty } from '../../interfaces/question/question-types';

const DIFFICULTY_BY_LABEL: Record<string, QuestionDifficulty> = {
  facil: 'easy',
  easy: 'easy',
  medio: 'medium',
  medium: 'medium',
  dificil: 'hard',
  hard: 'hard',
};

const LABEL_BY_DIFFICULTY: Record<
  QuestionDifficulty,
  'Fácil' | 'Médio' | 'Difícil'
> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

export function normalizeQuestionDifficulty(value: string): string {
  const normalized = value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return DIFFICULTY_BY_LABEL[normalized] ?? normalized;
}

export function normalizeQuestionDifficultyInput(value: unknown): unknown {
  return typeof value === 'string' ? normalizeQuestionDifficulty(value) : value;
}

export function getQuestionDifficultyLabel(
  value: QuestionDifficulty,
): 'Fácil' | 'Médio' | 'Difícil' {
  return LABEL_BY_DIFFICULTY[value];
}
