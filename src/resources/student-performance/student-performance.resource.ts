import { Injectable } from '@nestjs/common';
import type {
  StudentPerformanceAttemptsPage,
  StudentPerformanceSummary,
  StudentPerformanceAttempt,
} from '../../interfaces/student-performance/student-performance.interface';
import {
  resolveQuestionImageUrls,
  sanitizePublicQuestionContent,
} from '../../helper/question/question-content.helper';
import { ImageStorageService } from '../../service/image-storage.service';

@Injectable()
export class StudentPerformanceResource {
  constructor(private readonly imageStorageService: ImageStorageService) {}

  toSummary(summary: StudentPerformanceSummary): StudentPerformanceSummary {
    return summary;
  }

  toAttempt(attempt: StudentPerformanceAttempt): StudentPerformanceAttempt {
    const resolve = (value: string) =>
      resolveQuestionImageUrls(sanitizePublicQuestionContent(value), (path) =>
        this.imageStorageService.getPublicUrl(path),
      );
    return {
      ...attempt,
      statement: resolve(attempt.statement),
      answerComment: resolve(attempt.answerComment),
      options: attempt.options.map((option) => ({
        ...option,
        text: resolve(option.text),
      })),
    };
  }

  toAttemptsPage(
    page: StudentPerformanceAttemptsPage,
  ): StudentPerformanceAttemptsPage {
    return {
      ...page,
      items: page.items.map((item) => this.toAttempt(item)),
    };
  }
}
