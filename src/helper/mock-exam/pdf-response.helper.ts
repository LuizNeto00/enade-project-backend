import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { PdfStorageService } from '../../service/pdf-storage.service';

export async function sendPdf(
  storage: PdfStorageService,
  response: Response,
  path: string,
  name: string,
  download: boolean,
): Promise<StreamableFile> {
  const handle = await storage.open(path);
  const encodedName = encodeURIComponent(name).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="documento.pdf"; filename*=UTF-8''${encodedName}`,
  );
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'private, no-store');
  return new StreamableFile(handle.createReadStream());
}
