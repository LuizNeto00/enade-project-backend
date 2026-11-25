import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Question } from '../entities/question.entity';
import { QuestionComment } from '../entities/question-comment.entity';
import { QuestionCommentRepository } from '../repository/question-comment.repository';
import { QuestionCommentResource } from '../resources/question/question-comment.resource';
import {
  MAX_COMMENT_IMAGES,
  QuestionCommentStorageService,
} from './question-comment-storage.service';
import { CreateQuestionCommentRequest } from '../request/question-comment/create-question-comment.request';
import { UpdateQuestionCommentRequest } from '../request/question-comment/update-question-comment.request';

function normalizedId(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? String(value) : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^\d+$/.test(normalized) ? BigInt(normalized).toString() : null;
}

function sameId(left: unknown, right: unknown): boolean {
  const leftId = normalizedId(left);
  const rightId = normalizedId(right);
  return leftId !== null && rightId !== null && leftId === rightId;
}

function normalizedDecimalId(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  return BigInt(value.trim()).toString();
}

@Injectable()
export class QuestionCommentService {
  private readonly logger = new Logger(QuestionCommentService.name);
  constructor(
    private readonly repository: QuestionCommentRepository,
    private readonly resource: QuestionCommentResource,
    private readonly storage: QuestionCommentStorageService,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    questionId: number | string,
    user: User,
  ): Promise<{ count: number; items: Record<string, unknown>[] }> {
    const question = await this.findAccessibleQuestion(questionId, user);
    const comments = await this.repository.findByQuestion(questionId);
    const byId = new Map<string, QuestionComment>();
    for (const comment of comments) {
      comment.question = question;
      comment.replies = [];
      const id = normalizedId(comment.id);
      if (id) byId.set(id, comment);
    }
    const roots: QuestionComment[] = [];
    for (const comment of comments) {
      if (comment.deleted_at) continue;
      let parentId = normalizedId(comment.parent_id);
      let parent = parentId ? byId.get(parentId) : undefined;
      const visited = new Set<string>();
      while (parent?.deleted_at && parentId && !visited.has(parentId)) {
        visited.add(parentId);
        parentId = normalizedId(parent.parent_id);
        parent = parentId ? byId.get(parentId) : undefined;
      }
      if (parent?.deleted_at) parent = undefined;
      comment.parent_id = parent?.id ?? null;
      if (parent) parent.replies!.push(comment);
      else roots.push(comment);
    }
    return {
      count: comments.filter((comment) => !comment.deleted_at).length,
      items: roots.map((comment) => this.resource.toResponse(comment, user.id)),
    };
  }

  async create(
    questionId: number | string,
    request: CreateQuestionCommentRequest,
    files: Express.Multer.File[],
    user: User,
  ) {
    const question = await this.findAccessibleQuestion(questionId, user);
    const content = request.content?.trim() ?? '';
    this.storage.validate(files);
    if (!content && files.length === 0) {
      throw new BadRequestException(
        'Escreva um comentário ou envie uma imagem.',
      );
    }
    let parentId: string | null = null;
    if (request.parentId !== undefined) {
      parentId = normalizedId(request.parentId);
      if (!parentId || parentId === '0') {
        throw new BadRequestException('Resposta inválida.');
      }
    }
    const createdPaths: string[] = [];
    let saved: QuestionComment;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        if (parentId) {
          const parent = await this.repository.findForUpdate(
            parentId,
            questionId,
            manager,
          );
          if (!parent || parent.deleted_at) {
            throw new BadRequestException(
              'Não é possível responder a este comentário.',
            );
          }
        }
        const comment = await this.repository.save(
          {
            question_id: question.id,
            user_id: user.id,
            parent_id: parentId,
            content: content || null,
          },
          manager,
        );
        for (const file of files) {
          const path = this.storage.store(question.id, file);
          createdPaths.push(path);
          await this.repository.saveImage(
            {
              comment_id: comment.id,
              path,
              original_name: file.originalname,
              mime_type: file.mimetype,
              size: file.size,
            },
            manager,
          );
        }
        for (const mentionedUserId of request.mentionedUserIds ?? []) {
          const mentioned = await manager.getRepository(User).findOne({
            where: { id: mentionedUserId },
            select: { id: true, name: true },
          });
          if (mentioned) {
            await this.repository.saveMention(
              { comment_id: comment.id, mentioned_user_id: mentioned.id },
              manager,
            );
          }
        }
        return (await this.repository.findById(comment.id, manager)) ?? comment;
      });
    } catch (error) {
      for (const path of createdPaths) this.storage.remove(path);
      throw error;
    }
    saved.question = question;
    return this.resource.toResponse(saved, user.id);
  }

  async update(
    questionId: number | string,
    commentId: number | string,
    request: UpdateQuestionCommentRequest,
    files: Express.Multer.File[],
    user: User,
  ) {
    const comment = await this.repository.findByIdAndQuestion(
      commentId,
      questionId,
    );
    if (!comment || comment.deleted_at)
      throw new NotFoundException('Comentário não encontrado.');
    await this.findAccessibleQuestion(questionId, user);
    if (!sameId(comment.user_id, user.id))
      throw new ForbiddenException(
        'Você só pode editar seus próprios comentários.',
      );
    const content = request.content?.trim();
    const removeIds = request.removeImageIds
      ? request.removeImageIds.split(',').map((value) => {
          const id = normalizedId(value);
          if (!id || id === '0') {
            throw new BadRequestException('Identificador de imagem inválido.');
          }
          return id;
        })
      : [];
    this.storage.validate(files);
    const createdPaths: string[] = [];
    const removedPaths: string[] = [];
    try {
      await this.dataSource.transaction(async (manager) => {
        const storedComment = await this.repository.findForUpdate(
          commentId,
          questionId,
          manager,
        );
        if (!storedComment || storedComment.deleted_at)
          throw new NotFoundException('Comentário não encontrado.');
        if (
          content !== undefined &&
          (content || null) !== storedComment.content
        ) {
          storedComment.content = content || null;
          storedComment.edited_at = new Date();
        }
        if (removeIds.length > 0) {
          const removable = await this.repository.findImageIds(
            commentId,
            removeIds,
            manager,
          );
          await this.repository.deleteImages(removable, manager);
          removedPaths.push(...removable.map((image) => image.path));
        }
        for (const file of files) {
          const normalizedQuestionId = normalizedId(questionId);
          if (!normalizedQuestionId) {
            throw new BadRequestException('Identificador da questão inválido.');
          }
          const path = this.storage.store(normalizedQuestionId, file);
          createdPaths.push(path);
          await this.repository.saveImage(
            {
              comment_id: commentId,
              path,
              original_name: file.originalname,
              mime_type: file.mimetype,
              size: file.size,
            },
            manager,
          );
        }
        const remainingImages = await this.repository.findImages(
          commentId,
          manager,
        );
        if (remainingImages.length > MAX_COMMENT_IMAGES) {
          throw new BadRequestException(
            'Envie no máximo 4 imagens por comentário.',
          );
        }
        if (!storedComment.content && remainingImages.length === 0) {
          throw new BadRequestException('O comentário não pode ficar vazio.');
        }
        await manager.getRepository(QuestionComment).save(storedComment);
      });
    } catch (error) {
      for (const path of createdPaths) this.storage.remove(path);
      throw error;
    }
    for (const path of removedPaths) this.storage.remove(path);
    const refreshed = await this.repository.findByIdAndQuestion(
      commentId,
      questionId,
    );
    if (!refreshed) throw new NotFoundException('Comentário não encontrado.');
    if (refreshed.question_id === null) {
      throw new NotFoundException('Comentário não encontrado.');
    }
    refreshed.question = await this.findAccessibleQuestion(
      refreshed.question_id,
      user,
    );
    return this.resource.toResponse(refreshed, user.id);
  }

  async getAuthorAvatar(
    questionId: number | string,
    authorId: number | string,
    user: User,
  ) {
    await this.findAccessibleQuestion(questionId, user);
    const image = await this.repository.findAuthorAvatar(questionId, authorId);
    if (!image) throw new NotFoundException('Foto não encontrada.');
    return image;
  }

  async remove(
    questionId: number | string,
    commentId: number | string,
    user: User,
  ) {
    const question = await this.findAccessibleQuestion(questionId, user);
    const paths = await this.dataSource.transaction(async (manager) => {
      const comment = await this.repository.findForUpdate(
        commentId,
        questionId,
        manager,
      );
      if (!comment || comment.deleted_at)
        throw new NotFoundException('Comentário não encontrado.');
      const canDelete =
        sameId(comment.user_id, user.id) ||
        (user.type_profile === 'teacher' &&
          sameId(question.teacher_id, user.id));
      if (!canDelete)
        throw new ForbiddenException('Você não pode excluir este comentário.');
      const images = await this.repository.findImages(commentId, manager);
      await this.repository.reparentChildren(comment, manager);
      await this.repository.deleteImages(images, manager);
      await this.repository.deleteMentionsForComments([commentId], manager);
      await this.repository.delete(commentId, manager);
      return images.map((image) => image.path);
    });
    for (const path of paths) {
      try {
        this.storage.remove(path);
      } catch (error) {
        this.logger.error(
          `Não foi possível remover a imagem do comentário: ${path}`,
          error,
        );
      }
    }
  }

  async searchMentionUsers(
    questionId: number | string,
    search: string,
    user: User,
  ) {
    await this.findAccessibleQuestion(questionId, user);
    const needle = search.trim();
    if (!needle) return [];
    const users = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('participant')
      .where('participant.name LIKE :needle', { needle: `%${needle}%` })
      .andWhere('participant.id IN (:...ids)', {
        ids: await this.participantIds(questionId),
      })
      .select([
        'participant.id',
        'participant.name',
        'participant.type_profile',
      ])
      .limit(10)
      .getMany();
    return users.map((participant) => ({
      id: String(participant.id),
      name: participant.name,
      typeProfile: participant.type_profile,
    }));
  }

  private async participantIds(questionId: number | string) {
    const comments = await this.repository.findByQuestion(questionId);
    const ids = new Set<string>();
    for (const comment of comments) {
      const userId = normalizedId(comment.user_id);
      if (userId) ids.add(userId);
    }
    if (ids.size === 0) return ['-1'];
    return [...ids];
  }

  private async findAccessibleQuestion(
    questionId: number | string,
    user: User,
  ) {
    const normalizedQuestionId = normalizedDecimalId(questionId);
    if (!normalizedQuestionId) {
      throw new NotFoundException('Questão não encontrada.');
    }
    const query = this.dataSource
      .getRepository(Question)
      .createQueryBuilder('question')
      .where('question.id = :id', { id: normalizedQuestionId });
    if (user.type_profile === 'student') {
      query.andWhere('question.status = :status', { status: 'active' });
    }
    const question = await query.getOne();
    if (!question) throw new NotFoundException('Questão não encontrada.');
    return question;
  }
}
