import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Brackets } from 'typeorm';
import { Question } from '../entities/question.entity';
import { QuestionImage } from '../entities/question-image.entity';
import { CreateQuestionDataDto } from '../dto/create-question-data.dto';
import { QuestionFiltersDataDto } from '../dto/question-filters-data.dto';
import { StudentQuestionFiltersDataDto } from '../dto/student-question-filters-data.dto';

@Injectable()
export class QuestionRepository {
  constructor(
    @InjectRepository(Question)
    private readonly repository: Repository<Question>,
  ) {}

  create(questionData: Partial<Question>): Question {
    return this.repository.create(questionData);
  }

  save(question: Question, manager?: EntityManager): Promise<Question> {
    return (manager?.getRepository(Question) ?? this.repository).save(question);
  }

  createFromData(
    data: CreateQuestionDataDto,
    teacherId: number,
    manager?: EntityManager,
  ): Promise<Question> {
    const repository = manager
      ? manager.getRepository(Question)
      : this.repository;
    const question = repository.create({
      teacher_id: teacherId,
      statement: data.statement,
      course: data.course,
      exam_year: data.examYear,
      level: data.level,
      option_count: data.optionCount,
      option_a: data.optionA,
      option_b: data.optionB,
      option_c: data.optionC,
      option_d: data.optionD,
      option_e: data.optionE,
      correct_option: data.correctOption,
      answer_comment: data.answerComment,
      status: data.status,
    });
    return repository.save(question);
  }

  findById(id: number): Promise<Question | null> {
    return this.repository.findOne({
      where: { id },
      relations: { images: true },
    });
  }

  findByTeacher(
    teacherId: number,
    filters: QuestionFiltersDataDto = new QuestionFiltersDataDto(),
  ): Promise<Question[]> {
    const query = this.repository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.images', 'image')
      .where('question.teacher_id = :teacherId', { teacherId });

    if (filters.search) {
      const escapedSearch = filters.search.replace(/[\\%_]/g, '\\$&');
      query.andWhere(
        new Brackets((searchQuery) => {
          searchQuery
            .where('CAST(question.id AS CHAR) = :questionId', {
              questionId: filters.search,
            })
            .orWhere("question.statement LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.course LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_a LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_b LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_c LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_d LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_e LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.answer_comment LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            });
        }),
      );
    }

    if (filters.examYear !== undefined) {
      query.andWhere('question.exam_year = :examYear', {
        examYear: filters.examYear,
      });
    }
    if (filters.course) {
      query.andWhere('question.course = :course', { course: filters.course });
    }
    if (filters.createdFrom) {
      query.andWhere('question.created_at >= :createdFrom', {
        createdFrom: filters.createdFrom,
      });
    }
    if (filters.createdToExclusive) {
      query.andWhere('question.created_at < :createdToExclusive', {
        createdToExclusive: filters.createdToExclusive,
      });
    }
    if (filters.status) {
      query.andWhere('question.status = :status', { status: filters.status });
    }

    return query
      .orderBy('question.created_at', 'DESC')
      .addOrderBy('question.id', 'DESC')
      .getMany();
  }

  findForStudent(
    filters: StudentQuestionFiltersDataDto = new StudentQuestionFiltersDataDto(),
  ): Promise<Question[]> {
    const query = this.repository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.images', 'image')
      .where('question.status = :status', { status: 'active' });

    if (filters.search) {
      const escapedSearch = filters.search.replace(/[\\%_]/g, '\\$&');
      query.andWhere(
        new Brackets((searchQuery) => {
          searchQuery
            .where('CAST(question.id AS CHAR) = :questionId', {
              questionId: filters.search,
            })
            .orWhere("question.statement LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.course LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_a LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_b LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_c LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_d LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            })
            .orWhere("question.option_e LIKE :search ESCAPE '\\\\'", {
              search: `%${escapedSearch}%`,
            });
        }),
      );
    }

    if (filters.examYear !== undefined) {
      query.andWhere('question.exam_year = :examYear', {
        examYear: filters.examYear,
      });
    }
    if (filters.course) {
      query.andWhere('question.course = :course', { course: filters.course });
    }
    if (filters.optionCount !== undefined) {
      query.andWhere('question.option_count = :optionCount', {
        optionCount: filters.optionCount,
      });
    }

    return query
      .orderBy('question.exam_year', 'DESC')
      .addOrderBy('question.id', 'DESC')
      .getMany();
  }

  findActiveById(id: number): Promise<Question | null> {
    return this.repository.findOne({
      where: { id, status: 'active' },
    });
  }

  async delete(id: number, manager?: EntityManager): Promise<boolean> {
    const result = await (
      manager?.getRepository(Question) ?? this.repository
    ).delete(id);
    return Boolean(result.affected);
  }

  findForUpdate(id: number, manager: EntityManager): Promise<Question | null> {
    return manager.getRepository(Question).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async deleteImagesForQuestion(
    questionId: number,
    manager: EntityManager,
  ): Promise<string[]> {
    const imageRepository = manager.getRepository(QuestionImage);
    const images = await imageRepository.find({
      select: { id: true, path: true },
      where: { question_id: questionId },
    });
    if (images.length === 0) return [];

    const imageIds = images.map((image) => image.id);
    const removedImages = await imageRepository.delete(imageIds);
    if (removedImages.affected !== imageIds.length) {
      throw new Error(
        'Não foi possível excluir todos os registros de imagens da questão.',
      );
    }
    return images.map((image) => image.path);
  }

  async findRemainingReferences(
    questionId: number,
    manager: EntityManager,
  ): Promise<Array<{ tableName: string; columnName: string; count: number }>> {
    const foreignKeys = await manager.query<
      Array<{ tableName: string; columnName: string }>
    >(`
      SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = 'questions'
        AND REFERENCED_COLUMN_NAME = 'id'
    `);

    const remaining: Array<{
      tableName: string;
      columnName: string;
      count: number;
    }> = [];
    for (const foreignKey of foreignKeys) {
      const tableName = foreignKey.tableName.replace(/`/g, '``');
      const columnName = foreignKey.columnName.replace(/`/g, '``');
      const [row] = await manager.query<Array<{ count: string | number }>>(
        `SELECT COUNT(*) AS count FROM \`${tableName}\` WHERE \`${columnName}\` = ?`,
        [questionId],
      );
      const count = Number(row?.count ?? 0);
      if (count > 0) {
        remaining.push({
          tableName: foreignKey.tableName,
          columnName: foreignKey.columnName,
          count,
        });
      }
    }
    return remaining;
  }
}
