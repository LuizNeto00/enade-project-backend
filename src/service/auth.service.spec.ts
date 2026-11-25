jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  TypeOrmModule: {
    forFeature: jest.fn(),
    forRoot: jest.fn(),
  },
}));

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { AuthToken } from '../entities/auth-token.entity';
import { UserRepository } from '../repository/user.repository';
import { AuthTokenRepository } from '../repository/auth-token.repository';
import { RegisterUserFactory } from '../factory/auth/register-user.factory';
import { AuthResource } from '../resources/auth/auth.resource';
import { RegisterUserDataDto } from '../dto/auth/register-user-data.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let authTokenRepository: jest.Mocked<AuthTokenRepository>;

  const makeTransactionManager = () => ({
    getRepository: jest.fn((entity: typeof User | typeof AuthToken) => {
      if (entity === User) {
        return {
          create: jest.fn((values: Record<string, unknown>) => values),
          save: jest.fn((input: Record<string, unknown>) =>
            Promise.resolve({
              ...input,
              id: 1,
              created_at: new Date(),
              updated_at: new Date(),
            }),
          ),
        };
      }

      return {
        create: jest.fn((values: Record<string, unknown>) => values),
        save: jest.fn((input: Record<string, unknown>) =>
          Promise.resolve(input),
        ),
      };
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            emailExists: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            findById: jest.fn(),
            create: jest.fn((data: RegisterUserDataDto) =>
              Promise.resolve({
                ...data,
                id: 1,
                created_at: new Date(),
                updated_at: new Date(),
              }),
            ),
          },
        },
        {
          provide: AuthTokenRepository,
          useValue: {
            findByTokenHash: jest.fn(),
            revokeToken: jest.fn(),
            createToken: jest.fn(),
          },
        },
        RegisterUserFactory,
        AuthResource,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(
              (
                callback: (
                  manager: ReturnType<typeof makeTransactionManager>,
                ) => Promise<unknown>,
              ) => callback(makeTransactionManager()),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    authTokenRepository = module.get(AuthTokenRepository);
  });

  it('should reject duplicate registration emails', async () => {
    userRepository.emailExists.mockResolvedValue(true);

    await expect(
      service.register({
        name: 'João',
        email: 'joao@email.com',
        password: '12345678',
        typeProfile: 'student',
        course: 'Ciência da Computação',
        institution: 'Universidade ENADE',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should register a new user without generating a token', async () => {
    userRepository.emailExists.mockResolvedValue(false);

    const result = await service.register({
      name: 'João da Silva',
      email: 'joao@email.com',
      password: '12345678',
      typeProfile: 'student',
      course: 'Ciência da Computação',
      institution: 'Universidade ENADE',
    });

    expect(result).toEqual({ message: 'Usuário cadastrado!' });
    expect(authTokenRepository.findByTokenHash.mock.calls).toHaveLength(0);
  });

  it('should register teachers with null course and institution', async () => {
    userRepository.emailExists.mockResolvedValue(false);

    const result = await service.register({
      name: 'João da Silva',
      email: 'joao@email.com',
      password: '12345678',
      typeProfile: 'teacher',
      course: null,
      institution: null,
    });

    expect(result).toEqual({ message: 'Usuário cadastrado!' });
    expect(authTokenRepository.findByTokenHash.mock.calls).toHaveLength(0);
  });

  it('should authenticate a user with valid credentials', async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      name: 'João',
      email: 'joao@email.com',
      password: '$2b$10$dPaiIEXqggwN8FFU6p6wuuOe.jAcbkRlKJDcyrYHh5/FBnvjq2IXS',
      type_profile: 'student',
      created_at: new Date(),
      updated_at: new Date(),
    } as User);

    const result = await service.login({
      email: 'joao@email.com',
      password: '12345678',
      typeProfile: 'student',
    });

    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('joao@email.com');
  });

  it('should authenticate a teacher with the matching profile', async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue({
      id: 2,
      name: 'Maria',
      email: 'maria@email.com',
      password: '$2b$10$dPaiIEXqggwN8FFU6p6wuuOe.jAcbkRlKJDcyrYHh5/FBnvjq2IXS',
      type_profile: 'teacher',
      created_at: new Date(),
      updated_at: new Date(),
    } as User);

    const result = await service.login({
      email: 'maria@email.com',
      password: '12345678',
      typeProfile: 'teacher',
    });

    expect(result.user.type_profile).toBe('teacher');
  });

  it('should reject a login when the requested profile does not match', async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      name: 'João',
      email: 'joao@email.com',
      password: '$2b$10$dPaiIEXqggwN8FFU6p6wuuOe.jAcbkRlKJDcyrYHh5/FBnvjq2IXS',
      type_profile: 'student',
      created_at: new Date(),
      updated_at: new Date(),
    } as User);

    await expect(
      service.login({
        email: 'joao@email.com',
        password: '12345678',
        typeProfile: 'teacher',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Credenciais inválidas',
    });
  });

  it('should reject an incorrect password with the generic credentials message', async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      name: 'João',
      email: 'joao@email.com',
      password: '$2b$10$dPaiIEXqggwN8FFU6p6wuuOe.jAcbkRlKJDcyrYHh5/FBnvjq2IXS',
      type_profile: 'student',
      created_at: new Date(),
      updated_at: new Date(),
    } as User);

    await expect(
      service.login({
        email: 'joao@email.com',
        password: 'senha-incorreta',
        typeProfile: 'student',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Credenciais inválidas',
    });
  });

  it('should reject invalid login credentials', async () => {
    userRepository.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'naoexiste@email.com',
        password: '12345678',
        typeProfile: 'student',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Credenciais inválidas',
    });
  });
});
