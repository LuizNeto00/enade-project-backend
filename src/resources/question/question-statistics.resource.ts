import { Injectable } from '@nestjs/common';
import { Question } from '../../entities/question.entity';
import type {
  QuestionAttemptStatistics,
  QuestionStatisticsResponse,
} from '../../interfaces/question/question-statistics.interface';
import { getQuestionDifficultyLabel } from '../../helper/question/question-difficulty.helper';
import { sanitizePublicQuestionContent } from '../../helper/question/question-content.helper';

@Injectable()
export class QuestionStatisticsResource {
  toResponse(
    question: Question,
    statistics: QuestionAttemptStatistics,
  ): QuestionStatisticsResponse {
    return {
      question: {
        id: String(question.id),
        course: question.course,
        examYear: question.exam_year,
        level: getQuestionDifficultyLabel(question.level),
        status: question.status,
        statement: sanitizePublicQuestionContent(question.statement),
      },
      ...statistics,
    };
  }
}
