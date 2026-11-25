import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { resolve, sep } from 'path';
import { randomUUID } from 'crypto';
import { QuestionImageField } from '../interfaces/question/question-image-field.type';
import { QUESTION_VALIDATION_MESSAGES } from '../validator/question/question-validation-messages';

export const MAX_QUESTION_IMAGE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_QUESTION_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

@Injectable()
export class ImageStorageService {
  private readonly uploadRoot = resolve(process.cwd(), 'uploads');

  getPublicUrl(path: string): string {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
    const baseUrl = (
      process.env.API_PUBLIC_URL ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    return `${baseUrl}/uploads/${normalized}`;
  }

  getRelativePath(
    questionId: number,
    field: QuestionImageField,
    mimeType: string,
  ): string {
    const fieldDirectory = field.replace(/_/g, '-');
    const extension = this.getExtension(mimeType);
    return `questions/${questionId}/${fieldDirectory}/${randomUUID()}${extension}`;
  }

  store(
    questionId: number,
    field: QuestionImageField,
    file: Express.Multer.File,
  ): {
    path: string;
    url: string;
  } {
    if (
      !ALLOWED_QUESTION_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_QUESTION_IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.imageType);
    }
    if (
      !this.hasValidMagicBytes(file) ||
      file.size <= 0 ||
      file.size > MAX_QUESTION_IMAGE_SIZE
    ) {
      throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.invalidImage);
    }

    const relativePath = this.getRelativePath(questionId, field, file.mimetype);
    const physicalPath = resolve(this.uploadRoot, relativePath);
    if (!physicalPath.startsWith(`${this.uploadRoot}${sep}`)) {
      throw new Error('Caminho de armazenamento inválido.');
    }

    mkdirSync(resolve(physicalPath, '..'), { recursive: true });
    writeFileSync(physicalPath, file.buffer);
    return { path: relativePath, url: `/uploads/${relativePath}` };
  }

  removeRelativePath(path: string): void {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
    const physicalPath = resolve(this.uploadRoot, normalized);
    if (!physicalPath.startsWith(`${this.uploadRoot}${sep}`)) return;
    if (existsSync(physicalPath)) unlinkSync(physicalPath);
  }

  private getExtension(mimeType: string): string {
    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    if (mimeType === 'image/gif') return '.gif';
    throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.imageType);
  }

  private hasValidMagicBytes(file: Express.Multer.File): boolean {
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
