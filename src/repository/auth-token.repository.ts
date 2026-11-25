import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthToken } from '../entities/auth-token.entity';

@Injectable()
export class AuthTokenRepository {
  constructor(
    @InjectRepository(AuthToken)
    private readonly repository: Repository<AuthToken>,
  ) {}

  async createToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    manager?: EntityManager,
  ): Promise<AuthToken> {
    const repository = manager?.getRepository(AuthToken) ?? this.repository;
    const authToken = repository.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked_at: null,
      last_used_at: null,
    });

    return repository.save(authToken);
  }

  async findByTokenHash(tokenHash: string): Promise<AuthToken | null> {
    return this.repository.findOne({
      where: { token_hash: tokenHash },
      relations: { user: true },
    });
  }

  async findValidByHash(tokenHash: string): Promise<AuthToken | null> {
    const authToken = await this.findByTokenHash(tokenHash);

    if (!authToken) {
      return null;
    }

    const now = new Date();

    if (authToken.revoked_at || authToken.expires_at <= now) {
      return null;
    }

    return authToken;
  }

  async updateLastUsed(authTokenId: number): Promise<void> {
    await this.repository.update(authTokenId, { last_used_at: new Date() });
  }

  async revokeToken(authTokenId: number): Promise<void> {
    await this.repository.update(authTokenId, { revoked_at: new Date() });
  }

  async findAllForUser(userId: number): Promise<AuthToken[]> {
    return this.repository.find({
      where: { user_id: userId },
    });
  }
}
