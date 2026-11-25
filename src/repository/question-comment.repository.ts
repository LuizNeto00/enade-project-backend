import { Injectable } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { QuestionComment } from '../entities/question-comment.entity';
import { QuestionCommentImage } from '../entities/question-comment-image.entity';
import { QuestionCommentMention } from '../entities/question-comment-mention.entity';
import { UserProfileImage } from '../entities/user-profile-image.entity';

function normalizedDecimalId(value: unknown): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError('Identificador inválido.');
    }
    return String(value);
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    throw new TypeError('Identificador inválido.');
  }
  return BigInt(value.trim()).toString();
}

@Injectable()
export class QuestionCommentRepository {
  constructor(
    @InjectRepository(QuestionComment)
    private readonly repository: Repository<QuestionComment>,
  ) {}

  findByQuestion(questionId: number | string) {
    return this.commentQuery(this.repository)
      .where('comment.question_id = :questionId', {
        questionId: normalizedDecimalId(questionId),
      })
      .orderBy('comment.created_at', 'ASC')
      .addOrderBy('comment.id', 'ASC')
      .getMany();
  }

  async findIdsByQuestion(
    questionId: number | string,
    manager: EntityManager,
  ): Promise<Array<number | string>> {
    const rows = await manager
      .getRepository(QuestionComment)
      .createQueryBuilder('comment')
      .select('comment.id', 'id')
      .where('comment.question_id = :questionId', {
        questionId: normalizedDecimalId(questionId),
      })
      .setLock('pessimistic_write')
      .getRawMany<{ id: number | string }>();
    return rows.map((row) => row.id);
  }

  findImagesByCommentIds(
    commentIds: Array<number | string>,
    manager: EntityManager,
  ): Promise<QuestionCommentImage[]> {
    if (commentIds.length === 0) return Promise.resolve([]);
    return manager.getRepository(QuestionCommentImage).find({
      select: { id: true, comment_id: true, path: true },
      where: { comment_id: In(commentIds.map(normalizedDecimalId)) },
    });
  }

  async detachFromQuestion(
    commentIds: Array<number | string>,
    manager: EntityManager,
  ): Promise<void> {
    if (commentIds.length === 0) return;
    const result = await manager
      .getRepository(QuestionComment)
      .update(
        { id: In(commentIds.map(normalizedDecimalId)) },
        { question_id: null },
      );
    if (result.affected !== commentIds.length) {
      throw new Error(
        'Não foi possível desvincular todos os comentários da questão.',
      );
    }
  }

  async detachChildren(
    commentIds: Array<number | string>,
    manager: EntityManager,
  ): Promise<void> {
    if (commentIds.length === 0) return;
    await manager
      .getRepository(QuestionComment)
      .update(
        { parent_id: In(commentIds.map(normalizedDecimalId)) },
        { parent_id: null },
      );
  }

  async deleteImagesForComments(
    images: QuestionCommentImage[],
    manager: EntityManager,
  ): Promise<void> {
    if (images.length === 0) return;
    const ids = images.map((image) => normalizedDecimalId(image.id));
    const result = await manager
      .getRepository(QuestionCommentImage)
      .delete(ids);
    if (result.affected !== ids.length) {
      throw new Error(
        'Não foi possível excluir todas as imagens dos comentários.',
      );
    }
  }

  async deleteMentionsForComments(
    commentIds: Array<number | string>,
    manager: EntityManager,
  ): Promise<void> {
    if (commentIds.length === 0) return;
    await manager
      .getRepository(QuestionCommentMention)
      .delete({ comment_id: In(commentIds.map(normalizedDecimalId)) });
  }

  async deleteByIds(
    commentIds: Array<number | string>,
    manager: EntityManager,
  ): Promise<void> {
    if (commentIds.length === 0) return;
    const ids = commentIds.map(normalizedDecimalId);
    const result = await manager.getRepository(QuestionComment).delete(ids);
    if (result.affected !== ids.length) {
      throw new Error('Não foi possível excluir todos os comentários.');
    }
  }

  private commentQuery(repository: Repository<QuestionComment>) {
    return repository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'author')
      .leftJoin('author.profileImage', 'avatar')
      .addSelect(['avatar.id', 'avatar.updated_at'])
      .leftJoinAndSelect('comment.images', 'images')
      .leftJoinAndSelect('comment.mentions', 'mentions')
      .leftJoinAndSelect('mentions.mentionedUser', 'mentionedUser');
  }

  findById(id: number | string, manager?: EntityManager) {
    const repository =
      manager?.getRepository(QuestionComment) ?? this.repository;
    return this.commentQuery(repository)
      .leftJoinAndSelect('comment.question', 'question')
      .where('comment.id = :id', { id: normalizedDecimalId(id) })
      .getOne();
  }

  findByIdAndQuestion(
    commentId: number | string,
    questionId: number | string,
    manager?: EntityManager,
  ) {
    const repository =
      manager?.getRepository(QuestionComment) ?? this.repository;
    return this.commentQuery(repository)
      .leftJoinAndSelect('comment.question', 'question')
      .where('comment.id = :id AND comment.question_id = :questionId', {
        id: normalizedDecimalId(commentId),
        questionId: normalizedDecimalId(questionId),
      })
      .getOne();
  }

  findAuthorAvatar(questionId: number | string, userId: number | string) {
    return this.repository.manager
      .getRepository(UserProfileImage)
      .createQueryBuilder('avatar')
      .innerJoin(
        QuestionComment,
        'comment',
        'comment.user_id = avatar.user_id AND comment.question_id = :questionId AND comment.deleted_at IS NULL',
        { questionId: normalizedDecimalId(questionId) },
      )
      .where('avatar.user_id = :userId', {
        userId: normalizedDecimalId(userId),
      })
      .getOne();
  }

  save(comment: Partial<QuestionComment>, manager: EntityManager) {
    const repository = manager.getRepository(QuestionComment);
    return repository.save(repository.create(comment));
  }

  saveImage(image: Partial<QuestionCommentImage>, manager: EntityManager) {
    const repository = manager.getRepository(QuestionCommentImage);
    return repository.save(repository.create(image));
  }

  saveMention(
    mention: Partial<QuestionCommentMention>,
    manager: EntityManager,
  ) {
    const repository = manager.getRepository(QuestionCommentMention);
    return repository.save(repository.create(mention));
  }

  findForUpdate(
    commentId: number | string,
    questionId: number | string,
    manager: EntityManager,
  ) {
    return manager.getRepository(QuestionComment).findOne({
      where: {
        id: normalizedDecimalId(commentId),
        question_id: normalizedDecimalId(questionId),
      },
      lock: { mode: 'pessimistic_write' },
    });
  }

  reparentChildren(comment: QuestionComment, manager: EntityManager) {
    return manager
      .getRepository(QuestionComment)
      .update(
        { parent_id: normalizedDecimalId(comment.id) },
        { parent_id: comment.parent_id },
      );
  }

  findImages(commentId: number | string, manager: EntityManager) {
    return manager.getRepository(QuestionCommentImage).find({
      where: {
        comment_id: normalizedDecimalId(commentId),
      },
    });
  }

  delete(commentId: number | string, manager: EntityManager) {
    return manager
      .getRepository(QuestionComment)
      .delete(normalizedDecimalId(commentId));
  }

  async findImageIds(
    commentId: number | string,
    imageIds: string[],
    manager: EntityManager,
  ): Promise<QuestionCommentImage[]> {
    if (imageIds.length === 0) return [];
    return manager.getRepository(QuestionCommentImage).findBy({
      id: In(imageIds),
      comment_id: normalizedDecimalId(commentId),
    });
  }

  deleteImages(images: QuestionCommentImage[], manager: EntityManager) {
    return manager
      .getRepository(QuestionCommentImage)
      .delete(images.map((image) => normalizedDecimalId(image.id)))
      .then((result) => {
        if (result.affected !== images.length) {
          throw new Error(
            'Não foi possível excluir todas as imagens do comentário.',
          );
        }
        return result;
      });
  }
}
