import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { constants } from 'fs';
import { mkdir, open, realpath, unlink } from 'fs/promises';
import { basename, extname, resolve, sep } from 'path';
import { PDFDocument } from 'pdf-lib';

const DEFAULT_MAX_PDF_SIZE = 50 * 1024 * 1024;
const PDF_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/;

export function getMaxPdfSize(): number {
  const configured = process.env.MOCK_EXAM_MAX_PDF_SIZE_BYTES;
  if (configured === undefined) return DEFAULT_MAX_PDF_SIZE;
  if (!/^[1-9]\d*$/.test(configured)) {
    throw new Error(
      'MOCK_EXAM_MAX_PDF_SIZE_BYTES deve ser um inteiro positivo.',
    );
  }
  const size = Number(configured);
  if (!Number.isSafeInteger(size)) {
    throw new Error('MOCK_EXAM_MAX_PDF_SIZE_BYTES excede o limite seguro.');
  }
  return size;
}

@Injectable()
export class PdfStorageService {
  private readonly logger = new Logger(PdfStorageService.name);
  private readonly root = resolve(
    process.env.MOCK_EXAM_STORAGE_DIR ?? 'storage/mock-exams',
  );
  private readonly maxSize = getMaxPdfSize();

  constructor() {
    const publicRoot = resolve(process.cwd(), 'uploads');
    if (
      this.root === publicRoot ||
      this.root.startsWith(`${publicRoot}${sep}`)
    ) {
      throw new Error('O armazenamento de PDFs não pode ser público.');
    }
  }

  async validate(file: Express.Multer.File): Promise<void> {
    const name = file.originalname;
    if (
      !name ||
      name.length > 255 ||
      basename(name) !== name ||
      /[\\/]/.test(name) ||
      [...name].some((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127;
      }) ||
      extname(name).toLowerCase() !== '.pdf' ||
      file.mimetype !== 'application/pdf'
    ) {
      throw new BadRequestException('Envie um arquivo PDF válido.');
    }
    if (
      !Buffer.isBuffer(file.buffer) ||
      file.size !== file.buffer.length ||
      file.size === 0 ||
      file.size > this.maxSize ||
      file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-' ||
      !/%%EOF\s*$/.test(file.buffer.subarray(-1024).toString('latin1'))
    ) {
      throw new BadRequestException(
        'O PDF é inválido ou excede o tamanho permitido.',
      );
    }
    try {
      const document = await PDFDocument.load(file.buffer, {
        throwOnInvalidObject: true,
        updateMetadata: false,
      });
      if (document.getPageCount() < 1) {
        throw new BadRequestException(
          'O PDF deve conter pelo menos uma página.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Não foi possível ler o PDF enviado.');
    }
  }

  async store(file: Express.Multer.File): Promise<string> {
    await this.validate(file);
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await this.assertPrivateRoot();
    const key = `${randomUUID()}.pdf`;
    const path = this.pathFor(key);
    const handle = await open(path, 'wx', 0o600);
    try {
      await handle.writeFile(file.buffer);
    } catch (error) {
      try {
        await unlink(path);
      } catch (cleanupError) {
        this.logger.error('Falha ao remover PDF incompleto.', cleanupError);
      }
      throw error;
    } finally {
      await handle.close();
    }
    return key;
  }

  async open(key: string) {
    await this.assertPrivateRoot();
    return open(this.pathFor(key), constants.O_RDONLY | constants.O_NOFOLLOW);
  }

  async remove(key: string): Promise<void> {
    await this.assertPrivateRoot();
    await unlink(this.pathFor(key));
  }

  private async assertPrivateRoot(): Promise<void> {
    const root = await realpath(this.root);
    const publicRoot = resolve(process.cwd(), 'uploads');
    let publicPath: string;
    try {
      publicPath = await realpath(publicRoot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      publicPath = publicRoot;
    }
    if (root === publicPath || root.startsWith(`${publicPath}${sep}`)) {
      throw new Error('O armazenamento de PDFs não pode ser público.');
    }
  }

  private pathFor(key: string): string {
    if (!PDF_KEY.test(key)) throw new Error('Referência de PDF inválida.');
    return resolve(this.root, key);
  }
}
