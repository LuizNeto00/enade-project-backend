jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { MockExamRepository } from '../repository/mock-exam.repository';
import { MockExamResource } from '../resources/mock-exam/mock-exam.resource';
import { CreateMockExamRequest } from '../request/mock-exam/create-mock-exam.request';
import { UpdateMockExamRequest } from '../request/mock-exam/update-mock-exam.request';
import { MockExamService } from './mock-exam.service';
import { getMaxPdfSize, PdfStorageService } from './pdf-storage.service';

describe('MockExamService', () => {
  const teacher = { id: 1, type_profile: 'teacher' } as User;
  const file = (name: string) =>
    ({ originalname: name }) as Express.Multer.File;

  function setup() {
    const exam = {
      id: 10,
      teacher_id: 1,
      title: 'Simulado',
      exam_pdf_path: 'old-exam',
      answer_key_pdf_path: 'old-key',
    };
    const repository = {
      findOwned: jest.fn().mockResolvedValue(exam),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      isPdfReferenced: jest.fn().mockResolvedValue(false),
    };
    const storage = {
      validate: jest.fn().mockResolvedValue(undefined),
      store: jest
        .fn()
        .mockResolvedValueOnce('new-exam')
        .mockResolvedValueOnce('new-key'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const resource = new MockExamResource();
    const transaction = jest.fn(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({} as EntityManager),
    );
    const service = new MockExamService(
      repository as unknown as MockExamRepository,
      storage as unknown as PdfStorageService,
      resource,
      { transaction } as unknown as DataSource,
    );
    return { service, repository, storage, transaction };
  }

  it('rejects student access to teacher operations', async () => {
    const { service, storage } = setup();
    await expect(
      service.create(new CreateMockExamRequest(), {}, {
        id: 2,
        type_profile: 'student',
      } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.store).not.toHaveBeenCalled();
  });

  it('exposes the configured upload limit only to teachers', () => {
    const { service } = setup();
    expect(service.uploadConfig(teacher)).toEqual({
      maxPdfSizeBytes: getMaxPdfSize(),
    });
    expect(() =>
      service.uploadConfig({ id: 2, type_profile: 'student' } as User),
    ).toThrow(ForbiddenException);
  });

  it('cleans new PDFs when creating a record fails', async () => {
    const { service, storage, transaction } = setup();
    transaction.mockRejectedValueOnce(new Error('database failure'));
    await expect(
      service.create(
        new CreateMockExamRequest(),
        {
          examPdf: [file('exam.pdf')],
          answerKeyPdf: [file('key.pdf')],
        },
        teacher,
      ),
    ).rejects.toThrow('database failure');
    expect(storage.remove.mock.calls).toEqual([['new-exam'], ['new-key']]);
  });

  it('replaces only the selected PDF and cleans the old file after commit', async () => {
    const { service, storage, transaction, repository } = setup();
    let committed = false;
    transaction.mockImplementationOnce(async (callback) => {
      const result = await callback({} as EntityManager);
      committed = true;
      return result;
    });
    storage.remove.mockImplementation(() => {
      expect(committed).toBe(true);
      return Promise.resolve();
    });
    await service.update(
      10,
      new UpdateMockExamRequest(),
      {
        examPdf: [file('new.pdf')],
      },
      teacher,
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        exam_pdf_path: 'new-exam',
        answer_key_pdf_path: 'old-key',
      }),
      expect.anything(),
    );
    expect(storage.remove.mock.calls).toEqual([['old-exam']]);
  });

  it('does not remove old files if the update transaction fails', async () => {
    const { service, storage, transaction } = setup();
    transaction.mockRejectedValueOnce(new Error('database failure'));
    await expect(
      service.update(
        10,
        new UpdateMockExamRequest(),
        {
          examPdf: [file('new.pdf')],
        },
        teacher,
      ),
    ).rejects.toThrow('database failure');
    expect(storage.remove.mock.calls).toEqual([['new-exam']]);
  });

  it('does not remove a new file if the database still references it after an uncertain failure', async () => {
    const { service, storage, transaction, repository } = setup();
    transaction.mockRejectedValueOnce(new Error('commit status unknown'));
    repository.isPdfReferenced.mockResolvedValueOnce(true);
    await expect(
      service.update(
        10,
        new UpdateMockExamRequest(),
        { examPdf: [file('new.pdf')] },
        teacher,
      ),
    ).rejects.toThrow('commit status unknown');
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('does not remove files if deletion fails', async () => {
    const { service, storage, transaction } = setup();
    transaction.mockRejectedValueOnce(new Error('database failure'));
    await expect(service.delete(10, teacher)).rejects.toThrow(
      'database failure',
    );
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
