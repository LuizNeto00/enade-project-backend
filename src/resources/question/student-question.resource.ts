import { Injectable } from '@nestjs/common';
import { Question } from '../../entities/question.entity';
import type { QuestionOptionLabel } from '../../interfaces/question/question-types';
import type {
  StudentQuestionAnswerResponse,
  StudentQuestionResponse,
} from '../../interfaces/question/student-question-response.interface';
import { getQuestionDifficultyLabel } from '../../helper/question/question-difficulty.helper';
import {
  resolveQuestionImageUrls,
  sanitizePublicQuestionContent,
} from '../../helper/question/question-content.helper';
import { ImageStorageService } from '../../service/image-storage.service';

const OPTION_LABELS: QuestionOptionLabel[] = ['A', 'B', 'C', 'D', 'E'];

@Injectable()
export class StudentQuestionResource {
  constructor(private readonly imageStorageService: ImageStorageService) {}

  toResponse(question: Question): StudentQuestionResponse {
    const resolveHtml = (html: string) =>
      resolveQuestionImageUrls(sanitizePublicQuestionContent(html), (path) =>
        this.imageStorageService.getPublicUrl(path),
      );
    const optionValues = [
      question.option_a,
      question.option_b,
      question.option_c,
      question.option_d,
      ...(question.option_count === 5 && question.option_e
        ? [question.option_e]
        : []),
    ];
    return {
      id: String(question.id),
      statement: resolveHtml(question.statement),
      course: question.course,
      examYear: question.exam_year,
      level: getQuestionDifficultyLabel(question.level),
      options: optionValues.map((text, index) => ({
        label: OPTION_LABELS[index],
        text: resolveHtml(text),
      })),
      images: (question.images ?? []).flatMap((image) => {
        if (image.field === 'answer_comment') return [];
        return [
          {
            key: image.key,
            name: image.name,
            mimeType: image.mime_type,
            size: image.size,
            field: image.field,
            url: this.imageStorageService.getPublicUrl(image.path),
          },
        ];
      }),
    };
  }

  toAnswerResponse(
    question: Question,
    selectedOption: QuestionOptionLabel,
  ): StudentQuestionAnswerResponse {
    return {
      isCorrect: selectedOption === question.correct_option,
      selectedOption,
      correctOption: question.correct_option,
      answerComment: resolveQuestionImageUrls(
        sanitizePublicQuestionContent(question.answer_comment),
        (path) => this.imageStorageService.getPublicUrl(path),
      ),
    };
  }
}
