import { Injectable } from '@nestjs/common';
import { Question } from '../../entities/question.entity';
import { QuestionResponse } from '../../interfaces/question/question-response.interface';
import { ImageStorageService } from '../../service/image-storage.service';
import { getQuestionDifficultyLabel } from '../../helper/question/question-difficulty.helper';
import { resolveQuestionImageUrls } from '../../helper/question/question-content.helper';

@Injectable()
export class QuestionResource {
  constructor(private readonly imageStorageService: ImageStorageService) {}

  toResponse(question: Question): QuestionResponse {
    const resolveHtml = (html: string) =>
      resolveQuestionImageUrls(html, (path) =>
        this.imageStorageService.getPublicUrl(path),
      );
    const options = [
      { label: 'A', text: question.option_a },
      { label: 'B', text: question.option_b },
      { label: 'C', text: question.option_c },
      { label: 'D', text: question.option_d },
      ...(question.option_count === 5 && question.option_e
        ? [{ label: 'E', text: question.option_e }]
        : []),
    ];

    return {
      id: String(question.id),
      teacherId: String(question.teacher_id),
      statement: resolveHtml(question.statement),
      course: question.course,
      examYear: question.exam_year,
      level: getQuestionDifficultyLabel(question.level),
      optionCount: question.option_count,
      optionA: resolveHtml(question.option_a),
      optionB: resolveHtml(question.option_b),
      optionC: resolveHtml(question.option_c),
      optionD: resolveHtml(question.option_d),
      optionE: question.option_e ? resolveHtml(question.option_e) : null,
      answerComment: resolveHtml(question.answer_comment),
      options: options.map((option) => ({
        ...option,
        text: resolveHtml(option.text),
      })),
      correctOption: question.correct_option,
      status: question.status,
      images: (question.images ?? []).map((image) => ({
        id: String(image.id),
        key: image.key,
        name: image.name,
        mimeType: image.mime_type,
        size: image.size,
        field: image.field,
        path: image.path,
        url: this.imageStorageService.getPublicUrl(image.path),
      })),
      createdAt: question.created_at.toISOString(),
      updatedAt: question.updated_at.toISOString(),
    };
  }
}
