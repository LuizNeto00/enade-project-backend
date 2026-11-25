import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UserProfileImage } from '../entities/user-profile-image.entity';

@Injectable()
export class UserProfileImageRepository {
  constructor(
    @InjectRepository(UserProfileImage)
    private readonly repository: Repository<UserProfileImage>,
  ) {}

  findByUserId(userId: number, manager?: EntityManager) {
    const repository =
      manager?.getRepository(UserProfileImage) ?? this.repository;
    return repository.findOne({ where: { user_id: userId } });
  }

  async upsert(
    userId: number,
    image: {
      fileName: string;
      mimeType: string;
      imageData: Buffer;
      fileSize: number;
    },
    manager: EntityManager,
  ) {
    const repository = manager.getRepository(UserProfileImage);
    const existing = await this.findByUserId(userId, manager);
    const record =
      existing ??
      repository.create({
        user_id: userId,
      });
    record.file_name = image.fileName;
    record.mime_type = image.mimeType;
    record.image_data = image.imageData;
    record.file_size = image.fileSize;
    return repository.save(record);
  }

  async remove(userId: number, manager: EntityManager) {
    const existing = await this.findByUserId(userId, manager);
    if (existing)
      await manager.getRepository(UserProfileImage).remove(existing);
  }
}
