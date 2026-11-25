import { Question } from '../../entities/question.entity';
import { QuestionImageReference } from '../../interfaces/question/question-image-reference.interface';
import { CreateQuestionDataDto } from '../../dto/create-question-data.dto';
import { applyQuestionImageReferences } from './question-content.helper';

export function applyQuestionData(
  question: Question,
  data: CreateQuestionDataDto,
  images: QuestionImageReference[] = [],
): Question {
  question.statement = applyQuestionImageReferences(
    data.statement,
    images,
    'statement',
  );
  question.course = data.course;
  question.exam_year = data.examYear;
  question.level = data.level;
  question.option_count = data.optionCount;
  question.option_a = applyQuestionImageReferences(
    data.optionA,
    images,
    'option_a',
  );
  question.option_b = applyQuestionImageReferences(
    data.optionB,
    images,
    'option_b',
  );
  question.option_c = applyQuestionImageReferences(
    data.optionC,
    images,
    'option_c',
  );
  question.option_d = applyQuestionImageReferences(
    data.optionD,
    images,
    'option_d',
  );
  question.option_e = data.optionE
    ? applyQuestionImageReferences(data.optionE, images, 'option_e')
    : null;
  question.correct_option = data.correctOption;
  question.status = data.status;
  question.answer_comment = applyQuestionImageReferences(
    data.answerComment,
    images,
    'answer_comment',
  );
  return question;
}
