import { PublicUser } from './public-user.interface';

export interface AuthLoginResponse {
  user: PublicUser;
  token: string;
  expires_at: string;
}

export interface MessageResponse {
  message: string;
}
