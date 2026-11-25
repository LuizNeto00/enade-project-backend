jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { QuestionImage } from '../entities/question-image.entity';
import { CreateQuestionImageDataDto } from '../dto/create-question-data.dto';
import { QuestionImageRepository } from '../repository/question-image.repository';
import { ImageStorageService } from './image-storage.service';
import { QuestionImageService } from './question-image.service';
import { BadRequestException } from '@nestjs/common';

describe('QuestionImageService.sync', () => {
  const createService = () => {
    const repository = {
      save: jest.fn((image: QuestionImage) =>
        Promise.resolve({
          ...image,
          id: 1,
        }),
      ),
      create: jest.fn((image: Partial<QuestionImage>) => image),
      deleteByKey: jest.fn(),
      countByPath: jest.fn(),
    };
    const storage = {
      store: jest.fn(
        (questionId: number, field: string, file: Express.Multer.File) => ({
          path: `${questionId}/${field}/${file.originalname}.png`,
          url: 'unused',
        }),
      ),
      removeRelativePath: jest.fn(),
    };
    return {
      service: new QuestionImageService(
        repository as unknown as QuestionImageRepository,
        storage as unknown as ImageStorageService,
      ),
      repository,
      storage,
    };
  };

  it('associates newly uploaded files by manifest key rather than multipart order', async () => {
    const { service, storage } = createService();
    const manifest = [
      {
        clientId: 'image-statement',
        field: 'statement',
        mimeType: 'image/png',
        size: 12,
        name: 'same-original-name.png',
      },
      {
        clientId: 'image-option-a',
        field: 'option_a',
        mimeType: 'image/png',
        size: 24,
        name: 'same-original-name.png',
      },
    ] as CreateQuestionImageDataDto[];
    const files = [
      {
        originalname: 'image-option-a',
        mimetype: 'image/png',
        size: 24,
      },
      {
        originalname: 'image-statement',
        mimetype: 'image/png',
        size: 12,
      },
    ] as Express.Multer.File[];

    await service.sync(1, [], manifest, files, {} as never);

    expect(storage.store).toHaveBeenNthCalledWith(1, 1, 'statement', files[1]);
    expect(storage.store).toHaveBeenNthCalledWith(2, 1, 'option_a', files[0]);
  });

  it('removes unique paths only when no image rows still reference them', async () => {
    const { service, repository, storage } = createService();
    repository.countByPath.mockImplementation((path: string) =>
      Promise.resolve(path === 'shared.png' ? 1 : 0),
    );

    await service.cleanDeletedQuestionPaths([
      'deleted.png',
      'shared.png',
      'deleted.png',
    ]);

    expect(repository.countByPath).toHaveBeenCalledTimes(2);
    expect(storage.removeRelativePath).toHaveBeenCalledTimes(1);
    expect(storage.removeRelativePath).toHaveBeenCalledWith('deleted.png');
  });

  it('does not fail an already committed deletion when file cleanup fails', async () => {
    const { service, repository, storage } = createService();
    repository.countByPath.mockRejectedValue(
      new Error('filesystem check failed'),
    );

    await expect(
      service.cleanDeletedQuestionPaths(['unavailable.png']),
    ).resolves.toBeUndefined();
    expect(storage.removeRelativePath).not.toHaveBeenCalled();
  });

  it('keeps existing image IDs and updates their field without reuploading', async () => {
    const { service, repository, storage } = createService();
    const existing = {
      id: 10,
      question_id: 1,
      key: 'existing-image',
      field: 'option_a',
      path: 'questions/1/statement/existing.png',
      mime_type: 'image/png',
      size: 12,
      name: 'existing.png',
    } as QuestionImage;
    const requested = {
      clientId: existing.key,
      field: existing.field,
      mimeType: existing.mime_type,
      size: existing.size,
      name: existing.name,
    };

    const result = await service.sync(
      1,
      [existing],
      [requested],
      [],
      {} as never,
    );

    expect(result.records).toHaveLength(1);
    expect(result.references[0]).toMatchObject({
      key: existing.key,
      path: existing.path,
      field: 'option_a',
    });
    expect(result.removedPaths).toEqual([]);
    expect(repository.deleteByKey).not.toHaveBeenCalled();
    expect(storage.store).not.toHaveBeenCalled();
  });

  it('removes only omitted images and returns paths for post-commit cleanup', async () => {
    const { service, repository } = createService();
    const existing = {
      id: 11,
      question_id: 1,
      key: 'removed-image',
      field: 'option_a',
      path: 'questions/1/option-a/removed.png',
      mime_type: 'image/png',
      size: 12,
      name: 'removed.png',
    } as QuestionImage;

    const result = await service.sync(1, [existing], [], [], {} as never);

    expect(repository.deleteByKey).toHaveBeenCalledWith(
      1,
      existing.key,
      expect.anything(),
    );
    expect(result.removedPaths).toEqual([existing.path]);
  });

  it('adds a new image while retaining an existing one without reuploading it', async () => {
    const { service, storage } = createService();
    const existing = {
      id: 12,
      question_id: 1,
      key: 'old-image',
      field: 'statement',
      path: 'questions/1/statement/old.png',
      mime_type: 'image/png',
      size: 12,
      name: 'same.png',
    } as QuestionImage;
    const requested = [
      {
        clientId: existing.key,
        field: existing.field,
        mimeType: existing.mime_type,
        size: existing.size,
        name: existing.name,
      },
      {
        clientId: 'new-image',
        field: 'option_b',
        mimeType: 'image/png',
        size: 24,
        name: 'same.png',
      },
    ] as CreateQuestionImageDataDto[];
    const newFile = {
      originalname: 'new-image',
      mimetype: 'image/png',
      size: 24,
    } as Express.Multer.File;

    const result = await service.sync(
      1,
      [existing],
      requested,
      [newFile],
      {} as never,
    );

    expect(result.records).toHaveLength(2);
    expect(result.references[0]).toMatchObject({
      key: existing.key,
      path: existing.path,
    });
    expect(storage.store).toHaveBeenCalledTimes(1);
    expect(storage.store).toHaveBeenCalledWith(1, 'option_b', newFile);
    expect(result.removedPaths).toEqual([]);
  });

  it('rejects unknown and extra upload IDs, including when no images exist yet', async () => {
    const { service } = createService();
    const requested = [
      {
        clientId: 'expected-image',
        field: 'statement',
        mimeType: 'image/png',
        size: 12,
        name: 'expected.png',
      },
    ] as CreateQuestionImageDataDto[];
    const unknownFile = {
      originalname: 'not-in-manifest',
      mimetype: 'image/png',
      size: 12,
    } as Express.Multer.File;

    await expect(
      service.sync(1, [], requested, [unknownFile], {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sync(1, [], [], [unknownFile], {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate multipart client IDs even when the expected count matches', async () => {
    const { service } = createService();
    const requested = [
      {
        clientId: 'image-one',
        field: 'statement',
        mimeType: 'image/png',
        size: 12,
        name: 'same-name.png',
      },
      {
        clientId: 'image-two',
        field: 'option_a',
        mimeType: 'image/png',
        size: 12,
        name: 'same-name.png',
      },
    ] as CreateQuestionImageDataDto[];
    const duplicateFiles = [
      {
        originalname: 'image-one',
        mimetype: 'image/png',
        size: 12,
      },
      {
        originalname: 'image-one',
        mimetype: 'image/png',
        size: 12,
      },
    ] as Express.Multer.File[];

    await expect(
      service.sync(1, [], requested, duplicateFiles, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
