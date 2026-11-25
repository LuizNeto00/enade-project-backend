import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repository/user.repository';
import { UserProfileImageRepository } from '../repository/user-profile-image.repository';
import { UserAccountResource } from '../resources/user/user-account.resource';
import { UpdateUserProfileRequest } from '../request/user/update-user-profile.request';
import { ChangeUserPasswordRequest } from '../request/user/change-user-password.request';
import { normalizeEmail } from '../helper/auth/auth-data.helper';
import { courseOptions } from '../constants/course-options';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class UserAccountService {
  constructor(
    private readonly users: UserRepository,
    private readonly images: UserProfileImageRepository,
    private readonly resource: UserAccountResource,
    private readonly dataSource: DataSource,
  ) {}

  async getProfile(userId: number) {
    const user = await this.users.findById(userId);
    if (!user)
      throw new UnauthorizedException(
        'Token inválido ou usuário não encontrado.',
      );
    return this.resource.toProfile(user);
  }

  async updateProfile(userId: number, request: UpdateUserProfileRequest) {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user)
      throw new UnauthorizedException(
        'Token inválido ou usuário não encontrado.',
      );
    const email = normalizeEmail(request.email);
    if (await this.users.findByEmailExcludingUser(email, userId)) {
      throw new ConflictException('E-mail já cadastrado.');
    }
    user.name = request.name.trim();
    user.email = email;
    if (user.type_profile === 'student') {
      if (!request.course || !courseOptions.includes(request.course)) {
        throw new BadRequestException('Selecione um curso válido.');
      }
      if (!request.institution || request.institution.trim().length < 3) {
        throw new BadRequestException('Informe sua instituição de ensino.');
      }
      user.course = request.course;
      user.institution = request.institution.trim();
    }
    await this.users.save(user);
    return this.resource.toProfile((await this.users.findById(userId)) ?? user);
  }

  async changePassword(userId: number, request: ChangeUserPasswordRequest) {
    if (request.newPassword !== request.confirmNewPassword) {
      throw new BadRequestException('As novas senhas não coincidem.');
    }
    if (request.newPassword === request.currentPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }
    const user = await this.users.findByIdWithPassword(userId);
    if (!user)
      throw new UnauthorizedException(
        'Token inválido ou usuário não encontrado.',
      );
    if (!(await bcrypt.compare(request.currentPassword, user.password))) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }
    user.password = await bcrypt.hash(request.newPassword, 10);
    await this.users.save(user);
    return { message: 'Senha alterada com sucesso.' };
  }

  async getAvatar(userId: number) {
    return this.images.findByUserId(userId);
  }

  async upsertAvatar(userId: number, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Selecione uma imagem.');
    if (file.size <= 0 || file.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException('A imagem deve ter entre 1 byte e 5 MB.');
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato inválido. Utilize JPEG, PNG ou WebP.',
      );
    }
    const mimeType = this.detectAvatarMimeType(file);
    if (!mimeType)
      throw new BadRequestException('O arquivo não contém uma imagem válida.');
    await this.dataSource.transaction((manager) =>
      this.images.upsert(
        userId,
        {
          fileName: file.originalname,
          mimeType,
          imageData: file.buffer,
          fileSize: file.size,
        },
        manager,
      ),
    );
    return this.getProfile(userId);
  }

  async removeAvatar(userId: number) {
    await this.dataSource.transaction((manager) =>
      this.images.remove(userId, manager),
    );
    return this.getProfile(userId);
  }

  private detectAvatarMimeType(
    file: Express.Multer.File,
  ): 'image/jpeg' | 'image/png' | 'image/webp' | null {
    const bytes = file.buffer.subarray(0, 12);
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
      return 'image/jpeg';
    if (
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    )
      return 'image/png';
    if (
      bytes.subarray(0, 4).toString() === 'RIFF' &&
      bytes.subarray(8, 12).toString() === 'WEBP'
    )
      return 'image/webp';
    return null;
  }
}
