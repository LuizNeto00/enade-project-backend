import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'performanceDateRange', async: false })
export class PerformanceDateRangeValidator implements ValidatorConstraintInterface {
  validate(answeredTo: unknown, args: ValidationArguments): boolean {
    const source = args.object as { answeredFrom?: string };
    if (!source.answeredFrom || typeof answeredTo !== 'string') return true;
    return source.answeredFrom <= answeredTo;
  }

  defaultMessage(): string {
    return 'A data inicial não pode ser posterior à data final.';
  }
}
