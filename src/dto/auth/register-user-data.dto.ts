import { UserProfileType } from '../../interfaces/auth/user-profile.type';

export class RegisterUserDataDto {
  name: string = '';
  email: string = '';
  password: string = '';
  typeProfile: UserProfileType = 'student';
  course: string | null = null;
  institution: string | null = null;
}
