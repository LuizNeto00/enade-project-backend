import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { QueryFailedError } from 'typeorm';

type HttpErrorDetails = {
  statusCode: number;
  error: string;
  message: string | string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function getErrorType(statusCode: number): string {
  const statusName = HttpStatus[statusCode];

  if (!statusName) {
    return 'Error';
  }

  return statusName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getHttpErrorDetails(exception: HttpException): HttpErrorDetails {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return {
      statusCode,
      error: getErrorType(statusCode),
      message: response,
    };
  }

  const responseMessage = isRecord(response) ? response.message : undefined;
  const message =
    typeof responseMessage === 'string' || isStringArray(responseMessage)
      ? responseMessage
      : exception.message;
  const error =
    isRecord(response) && typeof response.error === 'string'
      ? response.error
      : getErrorType(statusCode);

  return { statusCode, error, message };
}

function isDuplicateEntry(error: unknown): error is QueryFailedError {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  return isRecord(driverError) && driverError.code === 'ER_DUP_ENTRY';
}

function redactSensitiveText(value: string): string {
  return value
    .replace(
      /\b(password|token_hash|token|authorization|body)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      '$1$2[REDACTED]',
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]');
}

function redactMessage(message: string | string[]): string | string[] {
  return Array.isArray(message)
    ? message.map(redactSensitiveText)
    : redactSensitiveText(message);
}

function appendErrorLog(
  level: 'warn' | 'error',
  context: string,
  statusCode: number,
  message: string | string[],
  stack?: string,
): void {
  const logsDirectory = join(process.cwd(), 'logs');
  const logFile = join(logsDirectory, 'error.log');
  const record: {
    timestamp: string;
    level: 'warn' | 'error';
    context: string;
    statusCode: number;
    message: string | string[];
    stack?: string;
  } = {
    timestamp: new Date().toISOString(),
    level,
    context,
    statusCode,
    message: redactMessage(message),
  };

  if (stack) {
    record.stack = redactSensitiveText(stack);
  }

  mkdirSync(logsDirectory, { recursive: true });
  appendFileSync(logFile, `${JSON.stringify(record)}\n`, 'utf8');
}

export function handleControllerError(error: unknown, context: string): never {
  const logger = new Logger(context);

  if (error instanceof HttpException) {
    const details = getHttpErrorDetails(error);
    const message = redactMessage(details.message);
    const logMessage = Array.isArray(message) ? message.join(', ') : message;

    logger.warn(logMessage, context);
    appendErrorLog('warn', context, details.statusCode, details.message);

    throw new HttpException(details, details.statusCode);
  }

  if (isDuplicateEntry(error)) {
    const details: HttpErrorDetails = {
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: 'Registro já existe.',
    };

    logger.warn(details.message, context);
    appendErrorLog('warn', context, details.statusCode, details.message);

    throw new HttpException(details, details.statusCode);
  }

  const internalError =
    error instanceof Error ? error : new Error(String(error));
  const safeMessage = redactSensitiveText(internalError.message);
  const safeStack = internalError.stack
    ? redactSensitiveText(internalError.stack)
    : undefined;
  const details: HttpErrorDetails = {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'Internal Server Error',
    message: 'Erro interno do servidor.',
  };

  logger.error(safeMessage, safeStack, context);
  appendErrorLog('error', context, details.statusCode, safeMessage, safeStack);

  throw new HttpException(details, details.statusCode);
}
