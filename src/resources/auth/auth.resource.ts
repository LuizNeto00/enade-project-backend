import { Injectable } from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { PublicUser } from '../../interfaces/auth/public-user.interface';
import { AUTH_VALIDATION_MESSAGES } from '../../validator/auth/auth-validation-messages';
import {
  AuthLoginResponse,
  MessageResponse,
} from '../../interfaces/auth/auth-response.interface';

@Injectable()
export class AuthResource {
  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      type_profile: user.type_profile,
      course: user.course,
      institution: user.institution,
      created_at: user.created_at,
      updated_at: user.updated_at,
      avatarUrl: user.profileImage
        ? `/users/me/avatar?version=${encodeURIComponent(user.profileImage.updated_at.toISOString())}`
        : null,
    };
  }

  toLoginResponse(
    user: User,
    token: string,
    expiresAt: Date,
  ): AuthLoginResponse {
    return {
      user: this.toPublicUser(user),
      token,
      expires_at: expiresAt.toISOString(),
    };
  }

  toLogoutResponse(): MessageResponse {
    return { message: AUTH_VALIDATION_MESSAGES.logoutSuccess };
  }

  toRegisterResponse(): MessageResponse {
    return { message: AUTH_VALIDATION_MESSAGES.registerSuccess };
  }
}
