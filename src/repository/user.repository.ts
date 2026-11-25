import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterUserDataDto } from '../dto/auth/register-user-data.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: { profileImage: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profileImage', 'profileImage')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmailExcludingUser(email: string, userId: number) {
    return this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.id != :userId', { userId })
      .getOne();
  }

  save(user: User, manager?: EntityManager) {
    const repository = manager?.getRepository(User) ?? this.repository;
    return repository.save(user);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profileImage', 'profileImage')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return Boolean(user);
  }

  async create(
    userData: RegisterUserDataDto,
    manager?: EntityManager,
  ): Promise<User> {
    const repository = manager?.getRepository(User) ?? this.repository;
    const user = repository.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      type_profile: userData.typeProfile,
      course: userData.course,
      institution: userData.institution,
    });
    return repository.save(user);
  }
}
