import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { UserProfileType } from '../../interfaces/auth/user-profile.type';
import { AUTH_VALIDATION_MESSAGES } from './auth-validation-messages';

export function validateRegistrationEmailAvailability(exists: boolean): void {
  if (exists) {
    throw new ConflictException(AUTH_VALIDATION_MESSAGES.duplicateEmail);
  }
}

export function validateLoginCredentials(
  user: User | null,
  passwordMatches: boolean,
  requestedProfile: UserProfileType,
): asserts user is User {
  if (!user || !passwordMatches || user.type_profile !== requestedProfile) {
    throw new UnauthorizedException(
      AUTH_VALIDATION_MESSAGES.invalidCredentials,
    );
  }
}
