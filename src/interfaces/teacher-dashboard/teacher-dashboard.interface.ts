export interface TeacherDashboardDateRange {
  from: string;
  to: string;
  granularity: 'day' | 'month';
}

export interface TeacherDashboardSummary {
  totalQuestions: number;
  activeQuestions: number;
  inactiveQuestions: number;
  questionsCreatedInPeriod: number;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  uniqueStudents: number;
  questionsAnswered: number;
  accuracyRate: number;
  errorRate: number;
  publishedComments: number;
  discussionReplies: number;
}

export interface TeacherDashboardActivityPoint {
  date: string;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export interface TeacherDashboardQuestionPerformance {
  id: string;
  statementPreview: string;
  course: string;
  examYear: number;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyRate: number;
  errorRate: number;
}

export interface TeacherDashboardData {
  period: TeacherDashboardDateRange;
  summary: TeacherDashboardSummary;
  activity: TeacherDashboardActivityPoint[];
  mostDifficultQuestions: TeacherDashboardQuestionPerformance[];
  bestPerformingQuestions: TeacherDashboardQuestionPerformance[];
  minimumRankingAnswers: number;
}
