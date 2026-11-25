import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { QUESTION_VALIDATION_MESSAGES } from './question-validation-messages';

@ValidatorConstraint({ name: 'isCreatedDateRangeValid', async: false })
export class CreatedDateRangeValidator implements ValidatorConstraintInterface {
  validate(createdTo: unknown, args: ValidationArguments): boolean {
    const createdFrom = (args.object as { createdFrom?: unknown }).createdFrom;
    if (typeof createdFrom !== 'string' || typeof createdTo !== 'string') {
      return true;
    }
    return createdFrom <= createdTo;
  }

  defaultMessage(): string {
    return QUESTION_VALIDATION_MESSAGES.invalidCreatedDateRange;
  }
}
