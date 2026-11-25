import { Injectable } from '@nestjs/common';
import { CreateQuestionDataDto } from '../../dto/create-question-data.dto';
import { QuestionImageField } from '../../interfaces/question/question-image-field.type';
import { CreateQuestionRequest } from '../../request/question/create-question.request';
import { sanitizeQuestionContent } from '../../helper/question/question-content.helper';
import { normalizeQuestionDifficulty } from '../../helper/question/question-difficulty.helper';
import { parseQuestionOptions } from '../../helper/question/question-options.helper';
import {
  validateQuestionCourse,
  validateQuestionDifficulty,
  validateQuestionStatus,
  validateQuestionYear,
} from '../../validator/question/question-data.validator';
import { validateQuestionContent } from '../../validator/question/question-content.validator';
import { validateQuestionOptions } from '../../validator/question/question-options.validator';
import {
  parseQuestionImageManifest,
  validateQuestionImageManifest,
} from '../../validator/question/question-image.validator';

@Injectable()
export class QuestionDataFactory {
  create(request: CreateQuestionRequest): CreateQuestionDataDto {
    const examYear = Number(request.examYear);
    validateQuestionYear(examYear);
    validateQuestionCourse(request.course);

    const normalizedDifficulty = normalizeQuestionDifficulty(request.level);
    validateQuestionDifficulty(normalizedDifficulty);
    const status = request.status ?? 'active';
    validateQuestionStatus(status);

    const optionCount = Number(request.optionCount);
    const parsedOptions = parseQuestionOptions(request.options);
    const options = validateQuestionOptions(
      parsedOptions,
      optionCount,
      request.correctOption,
    );

    const statement = sanitizeQuestionContent(request.statement);
    validateQuestionContent(statement, 'statement');
    const answerComment = sanitizeQuestionContent(request.answerComment);
    validateQuestionContent(answerComment, 'answerComment');

    const htmlByField: Record<QuestionImageField, string> = {
      statement,
      option_a: sanitizeQuestionContent(options.A),
      option_b: sanitizeQuestionContent(options.B),
      option_c: sanitizeQuestionContent(options.C),
      option_d: sanitizeQuestionContent(options.D),
      option_e: options.E ? sanitizeQuestionContent(options.E) : '',
      answer_comment: answerComment,
    };
    const images: QuestionImageManifestItem[] = parseQuestionImageManifest(
      request.imageManifest,
    );
    validateQuestionImageManifest(images, htmlByField);

    return {
      statement,
      course: request.course.trim(),
      examYear,
      level: normalizedDifficulty,
      optionCount: optionCount as 4 | 5,
      optionA: htmlByField.option_a,
      optionB: htmlByField.option_b,
      optionC: htmlByField.option_c,
      optionD: htmlByField.option_d,
      optionE: optionCount === 5 ? htmlByField.option_e : null,
      correctOption: request.correctOption
        .trim()
        .toUpperCase() as CreateQuestionDataDto['correctOption'],
      answerComment,
      status,
      images: images.map((image) => ({
        clientId: image.clientId,
        field: image.field,
        mimeType: image.mimeType,
        size: image.size,
        name: image.name ?? null,
      })),
    };
  }
}
