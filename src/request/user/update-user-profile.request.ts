import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmailInput } from '../../helper/auth/auth-data.helper';

export class UpdateUserProfileRequest {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @Length(3, 30, { message: 'O nome deve ter entre 3 e 30 caracteres.' })
  name: string = '';

  @Transform(({ value }) => normalizeEmailInput(value))
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string = '';

  @IsOptional()
  @IsString({ message: 'O curso deve ser um texto válido.' })
  course?: string | null;

  @IsOptional()
  @IsString({ message: 'A instituição deve ser um texto válido.' })
  @MinLength(3, { message: 'A instituição deve ter no mínimo 3 caracteres.' })
  @MaxLength(30, { message: 'A instituição deve ter no máximo 30 caracteres.' })
  institution?: string | null;
}
