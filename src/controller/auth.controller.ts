import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import { LoginRequest } from '../request/auth/login.request';
import { RegisterRequest } from '../request/auth/register.request';
import { AuthService } from '../service/auth.service';
import { handleControllerError } from '../common/errors/handle-controller-error';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerRequest: RegisterRequest) {
    try {
      return await this.authService.register(registerRequest);
    } catch (error) {
      handleControllerError(error, 'AuthController.register');
    }
  }

  @Post('login')
  async login(@Body() loginRequest: LoginRequest) {
    try {
      return await this.authService.login(loginRequest);
    } catch (error) {
      handleControllerError(error, 'AuthController.login');
    }
  }

  @Post('logout')
  @UseGuards(AuthTokenGuard)
  async logout(@Req() request: AuthenticatedRequest) {
    try {
      return await this.authService.logout(request.user.id, request.token);
    } catch (error) {
      handleControllerError(error, 'AuthController.logout');
    }
  }

  @Get('me')
  @UseGuards(AuthTokenGuard)
  async getAuthenticatedUser(@Req() request: AuthenticatedRequest) {
    try {
      return await this.authService.getAuthenticatedUser(request.user.id);
    } catch (error) {
      handleControllerError(error, 'AuthController.getAuthenticatedUser');
    }
  }
}
