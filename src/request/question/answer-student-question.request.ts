import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { QuestionOptionLabel } from '../../interfaces/question/question-types';

export class AnswerStudentQuestionRequest {
  @IsString({ message: 'Selecione uma alternativa válida.' })
  @IsNotEmpty({ message: 'A alternativa selecionada é obrigatória.' })
  @IsIn(['A', 'B', 'C', 'D', 'E'], {
    message: 'Selecione uma alternativa válida.',
  })
  selectedOption!: QuestionOptionLabel;
}
