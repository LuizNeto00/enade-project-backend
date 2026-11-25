import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from '../controller/auth.controller';
import { AuthToken } from '../entities/auth-token.entity';
import { User } from '../entities/user.entity';
import { AuthTokenRepository } from '../repository/auth-token.repository';
import { UserRepository } from '../repository/user.repository';
import { AuthService } from '../service/auth.service';
import { RegisterUserFactory } from '../factory/auth/register-user.factory';
import { AuthResource } from '../resources/auth/auth.resource';
import { UserProfileImage } from '../entities/user-profile-image.entity';
import { UserController } from '../controller/user.controller';
import { UserProfileImageRepository } from '../repository/user-profile-image.repository';
import { UserAccountService } from '../service/user-account.service';
import { UserAccountResource } from '../resources/user/user-account.resource';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthToken, UserProfileImage])],
  controllers: [AuthController, UserController],
  providers: [
    AuthService,
    UserRepository,
    AuthTokenRepository,
    RegisterUserFactory,
    AuthResource,
    UserProfileImageRepository,
    UserAccountService,
    UserAccountResource,
  ],
  exports: [AuthService, AuthTokenRepository],
})
export class AuthModule {}
