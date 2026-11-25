import { BadRequestException } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfStorageService } from './pdf-storage.service';

describe('PdfStorageService', () => {
  let directory: string;
  let pdf: Buffer;
  let service: PdfStorageService;
  const previousDirectory = process.env.MOCK_EXAM_STORAGE_DIR;
  const previousLimit = process.env.MOCK_EXAM_MAX_PDF_SIZE_BYTES;

  const file = (buffer: Buffer, name = 'prova.pdf'): Express.Multer.File =>
    ({
      originalname: name,
      mimetype: 'application/pdf',
      buffer,
      size: buffer.length,
    }) as Express.Multer.File;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mock-exam-pdf-'));
    process.env.MOCK_EXAM_STORAGE_DIR = directory;
    delete process.env.MOCK_EXAM_MAX_PDF_SIZE_BYTES;
    service = new PdfStorageService();
    const document = await PDFDocument.create();
    document.addPage();
    pdf = Buffer.from(await document.save());
  });

  afterEach(async () => {
    if (previousDirectory === undefined)
      delete process.env.MOCK_EXAM_STORAGE_DIR;
    else process.env.MOCK_EXAM_STORAGE_DIR = previousDirectory;
    if (previousLimit === undefined)
      delete process.env.MOCK_EXAM_MAX_PDF_SIZE_BYTES;
    else process.env.MOCK_EXAM_MAX_PDF_SIZE_BYTES = previousLimit;
    await rm(directory, { recursive: true, force: true });
  });

  it('stores, reads and removes a valid PDF using a generated key', async () => {
    const key = await service.store(file(pdf));
    expect(key).not.toContain('prova');
    expect(await readFile(join(directory, key))).toEqual(pdf);
    const handle = await service.open(key);
    expect(await handle.readFile()).toEqual(pdf);
    await handle.close();
    await service.remove(key);
    await expect(service.open(key)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects invalid names, MIME types, contents and traversal', async () => {
    await expect(
      service.store(file(pdf, '../prova.pdf')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.store({ ...file(pdf), mimetype: 'image/png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.store(file(Buffer.from('%PDF-1.7\ncorrupt\n%%EOF'))),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.open('../prova.pdf')).rejects.toThrow();
  });

  it('rejects files exceeding the configured limit', async () => {
    process.env.MOCK_EXAM_MAX_PDF_SIZE_BYTES = String(pdf.length - 1);
    const limitedService = new PdfStorageService();
    await expect(limitedService.store(file(pdf))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
