import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenRepository } from '../repository/auth-token.repository';
import { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { AUTH_VALIDATION_MESSAGES } from '../validator/auth/auth-validation-messages';
import { hashAuthToken } from '../helper/auth/auth-token.helper';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException(
        AUTH_VALIDATION_MESSAGES.invalidOrMissingToken,
      );
    }

    const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      throw new UnauthorizedException(
        AUTH_VALIDATION_MESSAGES.invalidOrMissingToken,
      );
    }

    const tokenHash = hashAuthToken(token);
    const authToken = await this.authTokenRepository.findValidByHash(tokenHash);

    if (!authToken || !authToken.user) {
      throw new UnauthorizedException(
        AUTH_VALIDATION_MESSAGES.invalidExpiredOrRevokedToken,
      );
    }

    request.user = authToken.user;
    request.token = token;

    await this.authTokenRepository.updateLastUsed(authToken.id);

    return true;
  }
}
