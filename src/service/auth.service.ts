import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthTokenRepository } from '../repository/auth-token.repository';
import { UserRepository } from '../repository/user.repository';
import { LoginRequest } from '../request/auth/login.request';
import { RegisterRequest } from '../request/auth/register.request';
import { normalizeEmail } from '../helper/auth/auth-data.helper';
import {
  createAuthTokenPayload,
  hashAuthToken,
} from '../helper/auth/auth-token.helper';
import {
  validateLoginCredentials,
  validateRegistrationEmailAvailability,
} from '../validator/auth/auth-credentials.validator';
import { RegisterUserFactory } from '../factory/auth/register-user.factory';
import { AuthResource } from '../resources/auth/auth.resource';
import { AUTH_VALIDATION_MESSAGES } from '../validator/auth/auth-validation-messages';
import {
  AuthLoginResponse,
  MessageResponse,
} from '../interfaces/auth/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly dataSource: DataSource,
    private readonly registerUserFactory: RegisterUserFactory,
    private readonly authResource: AuthResource,
  ) {}

  async register(request: RegisterRequest): Promise<MessageResponse> {
    const email = normalizeEmail(request.email);
    validateRegistrationEmailAvailability(
      await this.userRepository.emailExists(email),
    );

    const passwordHash = await bcrypt.hash(request.password, 10);
    const userData = this.registerUserFactory.create(
      { ...request, email },
      passwordHash,
    );
    await this.dataSource.transaction((manager) =>
      this.userRepository.create(userData, manager),
    );

    return this.authResource.toRegisterResponse();
  }

  async login(request: LoginRequest): Promise<AuthLoginResponse> {
    const user = await this.userRepository.findByEmailWithPassword(
      normalizeEmail(request.email),
    );
    const passwordMatches = user
      ? await bcrypt.compare(request.password, user.password)
      : false;
    validateLoginCredentials(user, passwordMatches, request.typeProfile);

    const tokenPayload = createAuthTokenPayload();
    await this.dataSource.transaction((manager) =>
      this.authTokenRepository.createToken(
        user.id,
        tokenPayload.tokenHash,
        tokenPayload.expiresAt,
        manager,
      ),
    );

    return this.authResource.toLoginResponse(
      user,
      tokenPayload.token,
      tokenPayload.expiresAt,
    );
  }

  async logout(userId: number, token: string): Promise<MessageResponse> {
    const authToken = await this.authTokenRepository.findByTokenHash(
      hashAuthToken(token),
    );
    if (authToken && authToken.user_id === userId && !authToken.revoked_at) {
      await this.authTokenRepository.revokeToken(authToken.id);
    }

    return this.authResource.toLogoutResponse();
  }

  async getAuthenticatedUser(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException(
        AUTH_VALIDATION_MESSAGES.invalidTokenUser,
      );
    }
    return this.authResource.toPublicUser(user);
  }
}
