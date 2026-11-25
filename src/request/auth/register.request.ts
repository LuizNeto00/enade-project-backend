import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { courseOptions } from '../../constants/course-options';
import type { UserProfileType } from '../../interfaces/auth/user-profile.type';
import { normalizeEmailInput } from '../../helper/auth/auth-data.helper';

export class RegisterRequest {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @Length(3, 30, { message: 'O nome deve ter entre 3 a 30 caracteres.' })
  name: string = '';

  @Transform(({ value }) => normalizeEmailInput(value))
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string = '';

  @IsNotEmpty({ message: 'O tipo do perfil é obrigatório.' })
  @IsIn(['teacher', 'student'], {
    message: 'O perfil deve ser aluno ou professor.',
  })
  typeProfile!: UserProfileType;

  @ValidateIf((request: RegisterRequest) => request.typeProfile === 'student')
  @IsNotEmpty({ message: 'Selecione seu curso.' })
  @IsString({ message: 'O curso deve ser um texto válido.' })
  @IsIn(courseOptions, { message: 'Selecione um curso válido.' })
  course: string | null = null;

  @ValidateIf((request: RegisterRequest) => request.typeProfile === 'student')
  @IsNotEmpty({ message: 'Informe sua instituição de ensino.' })
  @IsString({ message: 'A instituição deve ser um texto válido.' })
  @MaxLength(30, { message: 'A instituição deve ter no máximo 30 caracteres.' })
  @MinLength(3, { message: 'A instituição deve ter no mínimo 3 caracteres' })
  institution: string | null = null;

  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @Length(8, 255, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string = '';
}
