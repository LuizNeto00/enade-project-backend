import { Injectable } from '@nestjs/common';
import { QuestionComment } from '../../entities/question-comment.entity';
import { QuestionCommentStorageService } from '../../service/question-comment-storage.service';

function sameId(left: unknown, right: unknown): boolean {
  const normalize = (value: unknown) =>
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? BigInt(value.trim()).toString()
      : typeof value === 'number' && Number.isSafeInteger(value)
        ? String(value)
        : null;
  const leftId = normalize(left);
  const rightId = normalize(right);
  return leftId !== null && rightId !== null && leftId === rightId;
}

@Injectable()
export class QuestionCommentResource {
  constructor(private readonly storage: QuestionCommentStorageService) {}

  toResponse(
    comment: QuestionComment,
    currentUserId: number,
  ): Record<string, unknown> {
    const questionTeacherId = comment.question?.teacher_id;
    const isDeleted = Boolean(comment.deleted_at);
    return {
      id: String(comment.id),
      questionId: String(comment.question_id),
      parentId: comment.parent_id ? String(comment.parent_id) : null,
      content: isDeleted ? null : comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      editedAt: comment.edited_at,
      deletedAt: comment.deleted_at,
      isAuthor: sameId(comment.user_id, currentUserId),
      canEdit: !isDeleted && sameId(comment.user_id, currentUserId),
      canDelete:
        !isDeleted &&
        (sameId(comment.user_id, currentUserId) ||
          sameId(comment.question?.teacher_id, currentUserId)),
      user: isDeleted
        ? null
        : {
            id: String(comment.user_id),
            name: comment.user?.name ?? 'Usuário',
            typeProfile: comment.user?.type_profile ?? 'student',
            isQuestionCreator: sameId(questionTeacherId, comment.user_id),
            avatarUrl: comment.user?.profileImage
              ? `/question/${encodeURIComponent(String(comment.question_id))}/comments/authors/${encodeURIComponent(String(comment.user_id))}/avatar`
              : null,
          },
      images: isDeleted
        ? []
        : (comment.images ?? []).map((image) => ({
            id: String(image.id),
            name: image.original_name,
            mimeType: image.mime_type,
            size: image.size,
            url: this.storage.getPublicUrl(image.path),
          })),
      mentions: isDeleted
        ? []
        : (comment.mentions ?? []).map((mention) => ({
            id: String(mention.mentioned_user_id),
            name: mention.mentionedUser?.name ?? 'Usuário',
          })),
      replies: (comment.replies ?? []).map((reply) =>
        this.toResponse(reply, currentUserId),
      ),
    };
  }
}
