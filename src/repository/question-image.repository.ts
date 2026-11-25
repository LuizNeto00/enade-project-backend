import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { QuestionImage } from '../entities/question-image.entity';

@Injectable()
export class QuestionImageRepository {
  constructor(
    @InjectRepository(QuestionImage)
    private readonly repository: Repository<QuestionImage>,
  ) {}

  create(
    values: Partial<QuestionImage>,
    manager?: EntityManager,
  ): QuestionImage {
    return (manager?.getRepository(QuestionImage) ?? this.repository).create(
      values,
    );
  }

  save(image: QuestionImage, manager?: EntityManager): Promise<QuestionImage> {
    return (manager?.getRepository(QuestionImage) ?? this.repository).save(
      image,
    );
  }

  findByQuestion(
    questionId: number,
    manager?: EntityManager,
  ): Promise<QuestionImage[]> {
    return (manager?.getRepository(QuestionImage) ?? this.repository).find({
      where: { question_id: questionId },
    });
  }

  async deleteForQuestion(
    questionId: number,
    manager?: EntityManager,
  ): Promise<void> {
    await (manager?.getRepository(QuestionImage) ?? this.repository).delete({
      question_id: questionId,
    });
  }

  async deleteByKey(
    questionId: number,
    key: string,
    manager?: EntityManager,
  ): Promise<void> {
    await (manager?.getRepository(QuestionImage) ?? this.repository).delete({
      question_id: questionId,
      key,
    });
  }

  async countByPath(path: string): Promise<number> {
    return this.repository.count({ where: { path } });
  }
}
