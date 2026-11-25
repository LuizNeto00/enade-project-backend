import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'teacherDashboardDateRange', async: false })
export class TeacherDashboardDateRangeValidator implements ValidatorConstraintInterface {
  validate(to: unknown, args: ValidationArguments): boolean {
    const source = args.object as { from?: string; to?: string };
    if (Boolean(source.from) !== Boolean(source.to)) return false;
    if (!source.from || typeof source.to !== 'string') return true;
    return source.from <= source.to;
  }

  defaultMessage(): string {
    return 'Informe as duas datas e certifique-se de que a data inicial não seja posterior à final.';
  }
}
