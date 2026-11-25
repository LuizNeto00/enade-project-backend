import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CreateQuestionImageDataDto } from '../dto/create-question-data.dto';
import { QuestionImage } from '../entities/question-image.entity';
import { QuestionImageSyncResult } from '../interfaces/question/question-image-sync-result.interface';
import { QuestionImageRepository } from '../repository/question-image.repository';
import {
  ImageStorageService,
  MAX_QUESTION_IMAGE_SIZE,
  ALLOWED_QUESTION_IMAGE_MIME_TYPES,
} from './image-storage.service';
import { validateQuestionImageFileCount } from '../validator/question/question-image.validator';
import { QUESTION_VALIDATION_MESSAGES } from '../validator/question/question-validation-messages';

@Injectable()
export class QuestionImageService {
  private readonly logger = new Logger(QuestionImageService.name);

  constructor(
    private readonly imageRepository: QuestionImageRepository,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async sync(
    questionId: number,
    existing: QuestionImage[],
    requested: CreateQuestionImageDataDto[],
    files: Express.Multer.File[],
    manager: EntityManager,
  ): Promise<QuestionImageSyncResult> {
    const existingByKey = new Map(existing.map((image) => [image.key, image]));
    const newImages = requested.filter(
      (image) => !existingByKey.has(image.clientId),
    );
    validateQuestionImageFileCount(files.length, newImages.length);
    const filesByClientId = new Map<string, Express.Multer.File>();
    for (const file of files) {
      // The client sends clientId as the multipart filename; the real filename is in the manifest.
      const clientId = file.originalname;
      if (filesByClientId.has(clientId)) {
        throw new BadRequestException(
          QUESTION_VALIDATION_MESSAGES.imageFileCount,
        );
      }
      filesByClientId.set(clientId, file);
    }

    const records: QuestionImage[] = [];
    const references: QuestionImageReference[] = [];
    const createdPaths: string[] = [];
    const requestedKeys = new Set(requested.map((image) => image.clientId));
    const removedPaths = existing
      .filter((image) => !requestedKeys.has(image.key))
      .map((image) => image.path);

    try {
      for (const metadata of requested) {
        const previous = existingByKey.get(metadata.clientId);
        if (previous) {
          previous.field = metadata.field;
          const record = await this.imageRepository.save(previous, manager);
          records.push(record);
          references.push(this.toReference(record));
          continue;
        }

        const file = filesByClientId.get(metadata.clientId);
        if (!file) {
          throw new BadRequestException(
            QUESTION_VALIDATION_MESSAGES.imageFileCount,
          );
        }
        this.validateFileMetadata(file, metadata);
        filesByClientId.delete(metadata.clientId);
        const stored = this.imageStorage.store(
          questionId,
          metadata.field,
          file,
        );
        createdPaths.push(stored.path);
        const record = await this.imageRepository.save(
          this.imageRepository.create({
            question_id: questionId,
            field: metadata.field,
            path: stored.path,
            mime_type: file.mimetype,
            size: file.size,
            name: metadata.name,
            key: metadata.clientId,
          }),
          manager,
        );
        records.push(record);
        references.push(this.toReference(record));
      }

      if (filesByClientId.size > 0) {
        throw new BadRequestException(
          QUESTION_VALIDATION_MESSAGES.imageFileCount,
        );
      }

      for (const image of existing) {
        if (!requestedKeys.has(image.key)) {
          await this.imageRepository.deleteByKey(
            questionId,
            image.key,
            manager,
          );
        }
      }
    } catch (error) {
      this.cleanPaths(createdPaths);
      throw error;
    }

    return { records, references, createdPaths, removedPaths };
  }

  async cleanUnusedPaths(paths: string[]): Promise<void> {
    for (const path of paths) {
      if ((await this.imageRepository.countByPath(path)) === 0) {
        this.imageStorage.removeRelativePath(path);
      }
    }
  }

  async cleanDeletedQuestionPaths(paths: string[]): Promise<void> {
    for (const path of new Set(paths)) {
      try {
        if ((await this.imageRepository.countByPath(path)) === 0) {
          this.imageStorage.removeRelativePath(path);
        }
      } catch (error) {
        this.logger.error(
          `Não foi possível limpar o arquivo da imagem ${path} após excluir a questão.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  cleanPaths(paths: string[]): void {
    paths.forEach((path) => this.imageStorage.removeRelativePath(path));
  }

  private validateFileMetadata(
    file: Express.Multer.File | undefined,
    metadata: CreateQuestionImageDataDto,
  ): void {
    if (
      !file ||
      file.size <= 0 ||
      file.size > MAX_QUESTION_IMAGE_SIZE ||
      file.size !== metadata.size
    ) {
      throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.imageSize);
    }
    if (
      !ALLOWED_QUESTION_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_QUESTION_IMAGE_MIME_TYPES)[number],
      ) ||
      file.mimetype !== metadata.mimeType
    ) {
      throw new BadRequestException(QUESTION_VALIDATION_MESSAGES.imageType);
    }
  }

  private toReference(image: QuestionImage): QuestionImageReference {
    return {
      key: image.key,
      name: image.name,
      mimeType: image.mime_type,
      size: image.size,
      field: image.field,
      path: image.path,
      url: `/uploads/${image.path}`,
    };
  }
}
