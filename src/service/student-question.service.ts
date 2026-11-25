import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import type { QuestionOptionLabel } from '../interfaces/question/question-types';
import { QuestionRepository } from '../repository/question.repository';
import { StudentQuestionResource } from '../resources/question/student-question.resource';
import { AnswerStudentQuestionRequest } from '../request/question/answer-student-question.request';
import { FilterStudentQuestionsRequest } from '../request/question/filter-student-questions.request';
import { prepareStudentQuestionFilters } from '../helper/question/student-question-filters.helper';
import { QUESTION_VALIDATION_MESSAGES } from '../validator/question/question-validation-messages';
import { QuestionAttemptRepository } from '../repository/question-attempt.repository';
import { DataSource } from 'typeorm';

const OPTION_LABELS: QuestionOptionLabel[] = ['A', 'B', 'C', 'D', 'E'];

@Injectable()
export class StudentQuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly studentQuestionResource: StudentQuestionResource,
    private readonly questionAttemptRepository: QuestionAttemptRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(student: User, request: FilterStudentQuestionsRequest) {
    this.assertStudent(student, QUESTION_VALIDATION_MESSAGES.studentOnlyList);
    const questions = await this.questionRepository.findForStudent(
      prepareStudentQuestionFilters(request),
    );
    return questions.map((question) =>
      this.studentQuestionResource.toResponse(question),
    );
  }

  async answer(
    id: number,
    request: AnswerStudentQuestionRequest,
    student: User,
  ) {
    this.assertStudent(student, QUESTION_VALIDATION_MESSAGES.studentOnlyAnswer);
    const question = await this.questionRepository.findActiveById(id);
    if (!question) {
      throw new NotFoundException(
        QUESTION_VALIDATION_MESSAGES.questionNotFound,
      );
    }

    const availableOptions = OPTION_LABELS.slice(0, 4);
    if (question.option_count === 5 && question.option_e?.trim()) {
      availableOptions.push('E');
    }
    if (!availableOptions.includes(request.selectedOption)) {
      throw new BadRequestException(
        QUESTION_VALIDATION_MESSAGES.invalidStudentOption,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await this.questionAttemptRepository.save(
        {
          question_id: question.id,
          student_id: student.id,
          selected_option: request.selectedOption,
          is_correct: request.selectedOption === question.correct_option,
          correct_option: question.correct_option,
          question_snapshot: JSON.stringify({
            id: question.id,
            statement: question.statement,
            course: question.course,
            examYear: question.exam_year,
            level: question.level,
            optionCount: question.option_count,
            options: [
              { label: 'A', text: question.option_a },
              { label: 'B', text: question.option_b },
              { label: 'C', text: question.option_c },
              { label: 'D', text: question.option_d },
              ...(question.option_count === 5 && question.option_e
                ? [{ label: 'E', text: question.option_e }]
                : []),
            ],
            correctOption: question.correct_option,
            answerComment: question.answer_comment,
          }),
        },
        manager,
      );
    });
    return this.studentQuestionResource.toAnswerResponse(
      question,
      request.selectedOption,
    );
  }

  private assertStudent(student: User, message: string): void {
    if (student.type_profile !== 'student') {
      throw new ForbiddenException(message);
    }
  }
}
