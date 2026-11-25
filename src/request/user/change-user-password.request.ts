import { IsNotEmpty, Length } from 'class-validator';

export class ChangeUserPasswordRequest {
  @IsNotEmpty({ message: 'Informe a senha atual.' })
  @Length(8, 255, { message: 'A senha atual deve ter no mínimo 8 caracteres.' })
  currentPassword: string = '';

  @IsNotEmpty({ message: 'Informe a nova senha.' })
  @Length(8, 255, { message: 'A nova senha deve ter no mínimo 8 caracteres.' })
  newPassword: string = '';

  @IsNotEmpty({ message: 'Confirme a nova senha.' })
  @Length(8, 255, { message: 'A confirmação deve ter no mínimo 8 caracteres.' })
  confirmNewPassword: string = '';
}
