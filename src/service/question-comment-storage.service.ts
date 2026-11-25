import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { resolve, sep } from 'path';

export const MAX_COMMENT_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_COMMENT_IMAGES = 4;
export const ALLOWED_COMMENT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

@Injectable()
export class QuestionCommentStorageService {
  private readonly uploadRoot = resolve(process.cwd(), 'uploads');

  validate(files: Express.Multer.File[]) {
    if (files.length > MAX_COMMENT_IMAGES) {
      throw new BadRequestException(
        'Envie no máximo 4 imagens por comentário.',
      );
    }
    for (const file of files) {
      if (
        !ALLOWED_COMMENT_IMAGE_TYPES.includes(
          file.mimetype as (typeof ALLOWED_COMMENT_IMAGE_TYPES)[number],
        ) ||
        file.size <= 0 ||
        file.size > MAX_COMMENT_IMAGE_SIZE ||
        !this.hasValidMagicBytes(file)
      ) {
        throw new BadRequestException(
          'Envie apenas imagens JPEG, PNG, WebP ou GIF válidas de até 10 MB.',
        );
      }
    }
  }

  store(questionId: number | string, file: Express.Multer.File) {
    const extension =
      file.mimetype === 'image/jpeg'
        ? '.jpg'
        : file.mimetype === 'image/png'
          ? '.png'
          : file.mimetype === 'image/webp'
            ? '.webp'
            : '.gif';
    const relativePath = `comments/${questionId}/${randomUUID()}${extension}`;
    const physicalPath = resolve(this.uploadRoot, relativePath);
    if (!physicalPath.startsWith(`${this.uploadRoot}${sep}`)) {
      throw new Error('Caminho de imagem inválido.');
    }
    mkdirSync(resolve(physicalPath, '..'), { recursive: true });
    writeFileSync(physicalPath, file.buffer);
    return relativePath;
  }

  remove(relativePath: string) {
    const physicalPath = resolve(this.uploadRoot, relativePath);
    if (!physicalPath.startsWith(`${this.uploadRoot}${sep}`)) return;
    if (existsSync(physicalPath)) unlinkSync(physicalPath);
  }

  getPublicUrl(path: string) {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
    const baseUrl = (
      process.env.API_PUBLIC_URL ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    return `${baseUrl}/uploads/${normalized}`;
  }

  private hasValidMagicBytes(file: Express.Multer.File) {
    const bytes = file.buffer.subarray(0, 12);
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp =
      bytes.subarray(0, 4).toString() === 'RIFF' &&
      bytes.subarray(8, 12).toString() === 'WEBP';
    const gif = ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
    return jpeg || png || webp || gif;
  }
}
