import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AuthTokenGuard } from '../guards/auth-token.guard';
import type { AuthenticatedRequest } from '../interfaces/auth/authenticated-request.interface';
import { UpdateUserProfileRequest } from '../request/user/update-user-profile.request';
import { ChangeUserPasswordRequest } from '../request/user/change-user-password.request';
import { UserAccountService } from '../service/user-account.service';

@Controller('users')
@UseGuards(AuthTokenGuard)
export class UserController {
  constructor(private readonly service: UserAccountService) {}

  @Get('me')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.service.getProfile(request.user.id);
  }

  @Patch('me')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateUserProfileRequest,
  ) {
    return this.service.updateProfile(request.user.id, body);
  }

  @Patch('me/password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangeUserPasswordRequest,
  ) {
    return this.service.changePassword(request.user.id, body);
  }

  @Get('me/avatar')
  async getAvatar(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.service.getAvatar(request.user.id);
    if (!image)
      throw new BadRequestException('O usuário não possui foto de perfil.');
    response.set({
      'Content-Type': image.mime_type,
      'Cache-Control': 'private, no-cache',
      'Content-Disposition': 'inline',
    });
    return response.send(image.image_data);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  upsertAvatar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.upsertAvatar(request.user.id, file);
  }

  @Delete('me/avatar')
  removeAvatar(@Req() request: AuthenticatedRequest) {
    return this.service.removeAvatar(request.user.id);
  }
}
