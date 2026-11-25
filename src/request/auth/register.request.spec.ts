import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterRequest } from './register.request';

describe('RegisterRequest', () => {
  it('requires course and institution for students', async () => {
    const request = plainToInstance(RegisterRequest, {
      name: 'João da Silva',
      email: 'joao@example.com',
      typeProfile: 'student',
      password: '12345678',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['course', 'institution']),
    );
  });

  it('allows teachers to omit course and institution', async () => {
    const request = plainToInstance(RegisterRequest, {
      name: 'João da Silva',
      email: 'joao@example.com',
      typeProfile: 'teacher',
      password: '12345678',
    });

    await expect(validate(request)).resolves.toHaveLength(0);
  });

  it('rejects unknown courses and institutions over 30 characters', async () => {
    const request = plainToInstance(RegisterRequest, {
      name: 'João da Silva',
      email: 'joao@example.com',
      typeProfile: 'student',
      password: '12345678',
      course: 'Curso inexistente',
      institution: 'Instituição com mais de trinta caracteres',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['course', 'institution']),
    );
  });
});
