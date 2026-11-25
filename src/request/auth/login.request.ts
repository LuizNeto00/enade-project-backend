import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, Length } from 'class-validator';
import type { UserProfileType } from '../../interfaces/auth/user-profile.type';
import { normalizeEmailInput } from '../../helper/auth/auth-data.helper';

export class LoginRequest {
  @IsNotEmpty({ message: 'O tipo do perfil é obrigatório.' })
  @IsIn(['teacher', 'student'], {
    message: 'O perfil deve ser aluno ou professor.',
  })
  typeProfile!: UserProfileType;

  @Transform(({ value }) => normalizeEmailInput(value))
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string = '';

  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @Length(8, 255, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string = '';
}
