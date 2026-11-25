import { UserProfileType } from './user-profile.type';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  type_profile: UserProfileType;
  course: string | null;
  institution: string | null;
  created_at: Date;
  updated_at: Date;
  avatarUrl: string | null;
}
