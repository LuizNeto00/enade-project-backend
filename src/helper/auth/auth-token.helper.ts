import { createHash, randomBytes } from 'crypto';
import { TokenPayload } from '../../interfaces/auth/token-payload.interface';

export function hashAuthToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createAuthTokenPayload(): TokenPayload {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashAuthToken(token);
  const configuredTtl = Number(process.env.AUTH_TOKEN_TTL_HOURS);
  const ttlHours =
    Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 24;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}
