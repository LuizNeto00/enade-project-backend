import { Injectable } from '@nestjs/common';
import { RegisterUserDataDto } from '../../dto/auth/register-user-data.dto';
import { RegisterRequest } from '../../request/auth/register.request';
import { normalizeEmail } from '../../helper/auth/auth-data.helper';

@Injectable()
export class RegisterUserFactory {
  create(request: RegisterRequest, passwordHash: string): RegisterUserDataDto {
    return {
      name: request.name.trim(),
      email: normalizeEmail(request.email),
      password: passwordHash,
      typeProfile: request.typeProfile,
      course: request.typeProfile === 'student' ? request.course : null,
      institution:
        request.typeProfile === 'student' ? request.institution : null,
    };
  }
}
