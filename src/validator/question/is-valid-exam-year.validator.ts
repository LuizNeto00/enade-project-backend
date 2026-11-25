import { registerDecorator, ValidationOptions } from 'class-validator';

export const FIRST_EXAM_YEAR = 2004;

export function isValidExamYear(value: unknown): value is string {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) return false;
  const year = Number(text);
  return (
    Number.isInteger(year) &&
    year >= FIRST_EXAM_YEAR &&
    year <= new Date().getFullYear()
  );
}

export function IsValidExamYear(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidExamYear',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isValidExamYear(value);
        },
        defaultMessage(): string {
          return `O ano da questão deve estar entre ${FIRST_EXAM_YEAR} e ${new Date().getFullYear()}.`;
        },
      },
    });
  };
}
