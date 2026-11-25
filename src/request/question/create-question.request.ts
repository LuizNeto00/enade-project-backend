import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { courseOptions } from '../../constants/course-options';
import { IsValidExamYear } from '../../validator/question/is-valid-exam-year.validator';
import { normalizeQuestionDifficultyInput } from '../../helper/question/question-difficulty.helper';
import { trimStringInput } from '../../helper/shared/transform.helper';
import type { QuestionStatus } from '../../interfaces/question/question-types';

export class CreateQuestionRequest {
  @IsString()
  @IsNotEmpty({ message: 'O enunciado da questão é obrigatório.' })
  statement: string = '';

  @IsString()
  @IsNotEmpty({ message: 'Selecione um curso.' })
  @MaxLength(255, { message: 'O curso deve ter no máximo 255 caracteres.' })
  @IsIn(courseOptions, { message: 'Selecione um curso válido.' })
  course: string = '';

  @Transform(({ value }) => trimStringInput(value))
  @IsNotEmpty({ message: 'Informe um ano válido para a questão.' })
  @IsValidExamYear()
  examYear: string = '';

  @Transform(({ value }) => normalizeQuestionDifficultyInput(value))
  @IsString()
  @IsNotEmpty({ message: 'Selecione o nível de dificuldade.' })
  @IsIn(['easy', 'medium', 'hard'], {
    message: 'A dificuldade informada é inválida.',
  })
  level: string = '';

  @IsNotEmpty({ message: 'A quantidade de alternativas é obrigatória.' })
  @IsIn(['4', '5', 4, 5], {
    message: 'A questão deve possuir exatamente 4 ou 5 alternativas.',
  })
  optionCount: string | number = '';

  @IsString()
  @IsNotEmpty({ message: 'As alternativas são obrigatórias.' })
  options: string = '[]';

  @IsString()
  @IsNotEmpty({ message: 'A alternativa correta é obrigatória.' })
  correctOption: string = '';

  @IsString()
  @IsNotEmpty({ message: 'A resposta comentada é obrigatória.' })
  answerComment: string = '';

  @IsIn(['active', 'inactive'], {
    message: 'Selecione um status válido para a questão.',
  })
  status?: QuestionStatus = 'active';

  @IsString()
  @IsNotEmpty({ message: 'O manifesto de imagens possui um formato inválido.' })
  imageManifest: string = '[]';
}
