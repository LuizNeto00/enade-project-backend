jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { QuestionComment } from '../entities/question-comment.entity';
import { QuestionCommentRepository } from '../repository/question-comment.repository';
import { QuestionCommentResource } from '../resources/question/question-comment.resource';
import { QuestionCommentStorageService } from './question-comment-storage.service';
import { QuestionCommentService } from './question-comment.service';
import { UpdateQuestionCommentRequest } from '../request/question-comment/update-question-comment.request';

describe('QuestionCommentService replies and editing', () => {
  const creator = {
    id: 10,
    name: 'Professor Criador',
    type_profile: 'teacher',
  } as User;
  const otherTeacher = {
    id: 11,
    name: 'Outro Professor',
    type_profile: 'teacher',
  } as User;
  const student = { id: 20, name: 'Aluno', type_profile: 'student' } as User;

  function setup(comment: QuestionComment) {
    const repository = {
      findById: jest.fn().mockResolvedValue(comment),
      findByIdAndQuestion: jest.fn().mockResolvedValue(comment),
      findForUpdate: jest
        .fn()
        .mockImplementation((_id: string, questionId: string | number) =>
          Promise.resolve(
            String(comment.question_id) === String(questionId) ? comment : null,
          ),
        ),
      findByQuestion: jest.fn().mockResolvedValue([]),
      findAuthorAvatar: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      saveImage: jest.fn().mockResolvedValue(undefined),
      saveMention: jest.fn().mockResolvedValue(undefined),
      findImageIds: jest.fn().mockResolvedValue([]),
      findImages: jest.fn().mockResolvedValue(comment.images ?? []),
      deleteImages: jest.fn().mockResolvedValue(undefined),
      deleteMentionsForComments: jest.fn().mockResolvedValue(undefined),
      reparentChildren: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const storage = {
      validate: jest.fn(),
      store: jest.fn(),
      remove: jest.fn(),
    };
    const questionRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 5,
        teacher_id: creator.id,
        status: 'active',
      }),
    };
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: questionRepository.findOne,
    };
    Object.assign(questionRepository, {
      createQueryBuilder: jest.fn().mockReturnValue(query),
    });
    const commentRepository = {
      findOne: jest.fn().mockResolvedValue(comment),
      save: jest.fn().mockResolvedValue(comment),
      create: jest.fn().mockImplementation((value: unknown) => value),
      find: jest.fn().mockResolvedValue([]),
    };
    const transaction = jest.fn(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback({
          getRepository: jest.fn((entity) =>
            entity === User ? questionRepository : commentRepository,
          ),
        } as unknown as EntityManager),
    );
    const dataSource = {
      transaction,
      getRepository: jest.fn(() => questionRepository),
    };
    const service = new QuestionCommentService(
      repository as unknown as QuestionCommentRepository,
      new QuestionCommentResource(
        storage as unknown as QuestionCommentStorageService,
      ),
      storage as unknown as QuestionCommentStorageService,
      dataSource as unknown as DataSource,
    );
    return { service, repository, storage, questionRepository };
  }

  it('allows a teacher to reply even when the comment belongs to another user', async () => {
    const comment = {
      id: 30,
      question_id: 5,
      user_id: student.id,
      parent_id: null,
      deleted_at: null,
      content: 'Comentário do aluno',
      images: [],
    } as QuestionComment;
    const { service } = setup(comment);
    comment.user = student;
    comment.question = { id: 5, teacher_id: creator.id } as never;

    await expect(
      service.create(
        5,
        { content: 'Resposta do professor', parentId: '30' },
        [],
        otherTeacher,
      ),
    ).resolves.toBeDefined();
  });

  it('accepts BIGINT question_id as string when comparing with a numeric route ID', async () => {
    const reply = {
      id: 33,
      question_id: '2',
      user_id: '20',
      parent_id: null,
      deleted_at: null,
      content: 'Comentário com BIGINT',
      images: [],
    } as unknown as QuestionComment;
    const { service } = setup(reply);
    reply.user = student;
    reply.question = { id: 2, teacher_id: 10 } as never;

    await expect(
      service.update(
        2,
        33,
        Object.assign(new UpdateQuestionCommentRequest(), {
          content: 'Atualizado',
        }),
        [],
        student,
      ),
    ).resolves.toMatchObject({ content: 'Atualizado' });
  });

  it('allows the author to edit a reply but not another user', async () => {
    const reply = {
      id: 31,
      question_id: 5,
      user_id: student.id,
      parent_id: 30,
      deleted_at: null,
      content: 'Resposta original',
      images: [],
    } as QuestionComment;
    const { service } = setup(reply);
    reply.user = student;
    reply.question = { id: 5, teacher_id: creator.id } as never;

    await expect(
      service.update(
        5,
        31,
        Object.assign(new UpdateQuestionCommentRequest(), {
          content: 'Resposta atualizada',
        }),
        [],
        student,
      ),
    ).resolves.toMatchObject({ content: 'Resposta atualizada' });

    await expect(
      service.update(
        5,
        31,
        Object.assign(new UpdateQuestionCommentRequest(), {
          content: 'Não autorizado',
        }),
        [],
        otherTeacher,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow a non-creator teacher to delete another user comment', async () => {
    const comment = {
      id: 32,
      question_id: 5,
      user_id: student.id,
      parent_id: null,
      deleted_at: null,
      content: 'Comentário',
      images: [],
    } as QuestionComment;
    const { service } = setup(comment);
    comment.question = { id: 5, teacher_id: creator.id } as never;

    await expect(service.remove(5, 32, otherTeacher)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does not allow a student to delete another user comment', async () => {
    const comment = {
      id: '32',
      question_id: '5',
      user_id: creator.id,
      parent_id: null,
      deleted_at: null,
      images: [],
    } as QuestionComment;
    const { service, repository } = setup(comment);
    await expect(service.remove('5', '32', student)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('does not remove files if the delete transaction fails', async () => {
    const comment = {
      id: '32',
      question_id: '5',
      user_id: student.id,
      parent_id: null,
      deleted_at: null,
      images: [{ path: 'image.png' }],
    } as QuestionComment;
    const { service, repository, storage } = setup(comment);
    repository.reparentChildren.mockRejectedValue(new Error('database error'));
    await expect(service.remove('5', '32', student)).rejects.toThrow(
      'database error',
    );
    expect(repository.delete).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('creates a reply to a reply and rejects deleted or foreign parents', async () => {
    const parent = {
      id: '9007199254740993',
      question_id: '5',
      user_id: '20',
      parent_id: '30',
      deleted_at: null,
      images: [],
    } as QuestionComment;
    const { service, repository } = setup(parent);
    await service.create(
      '5',
      { content: 'Resposta profunda', parentId: '9007199254740993' },
      [],
      creator,
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: '9007199254740993' }),
      expect.anything(),
    );
    parent.deleted_at = new Date();
    await expect(
      service.create('5', { content: 'Resposta', parentId: '30' }, [], student),
    ).rejects.toBeInstanceOf(BadRequestException);
    parent.deleted_at = null;
    parent.question_id = '6';
    await expect(
      service.create('5', { content: 'Resposta', parentId: '30' }, [], student),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds a complete tree across string and number IDs, including deleted ancestors', async () => {
    const comments = [
      { id: 1, parent_id: null, deleted_at: new Date() },
      { id: '2', parent_id: '1', deleted_at: null },
      { id: 3, parent_id: 2, deleted_at: null },
      { id: '4', parent_id: '3', deleted_at: null },
      { id: 5, parent_id: 4, deleted_at: null },
    ].map((item) => ({
      ...item,
      question_id: '5',
      user_id: '20',
      content: 'Texto',
      images: [],
    })) as QuestionComment[];
    const { service, repository } = setup(comments[0]);
    repository.findByQuestion.mockResolvedValue(comments);
    const result = await service.list('5', student);
    expect(result.count).toBe(4);
    expect(result.items).toMatchObject([
      {
        id: '2',
        parentId: null,
        replies: [
          {
            id: '3',
            replies: [
              {
                id: '4',
                replies: [{ id: '5', replies: [] }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('exposes avatar references on replies without exposing image data', async () => {
    const author = {
      ...student,
      profileImage: { id: 8, image_data: Buffer.from('private') },
    } as User;
    const comments = [
      { id: 1, parent_id: null, user_id: 20, user: author },
      { id: 2, parent_id: 1, user_id: 10, user: creator },
      { id: 3, parent_id: 2, user_id: 20, user: author },
    ].map((item) => ({
      ...item,
      question_id: '5',
      deleted_at: null,
      images: [],
    })) as QuestionComment[];
    const { service, repository } = setup(comments[0]);
    repository.findByQuestion.mockResolvedValue(comments);
    const result = await service.list('5', student);
    expect(result.items).toMatchObject([
      {
        user: { avatarUrl: '/question/5/comments/authors/20/avatar' },
        replies: [
          {
            user: { avatarUrl: null },
            replies: [
              { user: { avatarUrl: '/question/5/comments/authors/20/avatar' } },
            ],
          },
        ],
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('returns an avatar only after checking access to the question', async () => {
    const comment = { id: 1, question_id: 5, user_id: 20 } as QuestionComment;
    const { service, repository, questionRepository } = setup(comment);
    const image = { mime_type: 'image/png', image_data: Buffer.from('image') };
    repository.findAuthorAvatar.mockResolvedValueOnce(image);
    await expect(service.getAuthorAvatar('5', '20', student)).resolves.toEqual(
      image,
    );
    expect(repository.findAuthorAvatar).toHaveBeenCalledWith('5', '20');
    await expect(
      service.getAuthorAvatar('5', '99', student),
    ).rejects.toBeInstanceOf(NotFoundException);
    questionRepository.findOne.mockResolvedValueOnce(null);
    repository.findAuthorAvatar.mockClear();
    await expect(
      service.getAuthorAvatar('6', '20', student),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findAuthorAvatar).not.toHaveBeenCalled();
  });

  it('allows the creator to delete another user reply without granting edit access', async () => {
    const reply = {
      id: '40',
      question_id: '5',
      user_id: '20',
      parent_id: '30',
      deleted_at: null,
      images: [],
    } as QuestionComment;
    const { service, repository } = setup(reply);
    await expect(
      service.update('5', '40', { content: 'Outro' }, [], creator),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await service.remove('5', '40', creator);
    expect(repository.reparentChildren).toHaveBeenCalledWith(
      reply,
      expect.anything(),
    );
    expect(repository.delete).toHaveBeenCalledWith('40', expect.anything());
  });

  it.each([
    ['student root', student, student.id, null],
    ['student reply', student, student.id, '30'],
    ['teacher root', creator, creator.id, null],
    ['teacher reply', creator, creator.id, '30'],
    ['creator removes student', creator, student.id, null],
    ['creator removes teacher reply', creator, otherTeacher.id, '30'],
  ])(
    'deletes %s without deleting descendants',
    async (_label, actor, authorId, parentId) => {
      const comment = {
        id: '40',
        question_id: '5',
        user_id: authorId,
        parent_id: parentId,
        deleted_at: null,
        images: [{ path: 'image.png' }],
      } as QuestionComment;
      const { service, repository, storage } = setup(comment);
      await service.remove('5', '40', actor);
      expect(repository.reparentChildren).toHaveBeenCalledWith(
        comment,
        expect.anything(),
      );
      expect(repository.delete).toHaveBeenCalledWith('40', expect.anything());
      expect(repository.deleteImages).toHaveBeenCalledWith(
        comment.images,
        expect.anything(),
      );
      expect(repository.deleteMentionsForComments).toHaveBeenCalledWith(
        ['40'],
        expect.anything(),
      );
      expect(storage.remove).toHaveBeenCalledWith('image.png');
    },
  );

  it('marks only actual content edits and returns the persisted timestamp', async () => {
    const comment = {
      id: '33',
      question_id: '5',
      user_id: student.id,
      parent_id: null,
      content: 'Antes',
      edited_at: null,
      deleted_at: null,
      images: [],
    } as QuestionComment;
    const { service } = setup(comment);
    await service.update('5', '33', { content: 'Antes' }, [], student);
    expect(comment.edited_at).toBeNull();
    const result = await service.update(
      '5',
      '33',
      { content: 'Depois' },
      [],
      student,
    );
    expect(result.editedAt).toBeInstanceOf(Date);
    expect(comment.edited_at).toEqual(result.editedAt);
  });

  it('does not remove an image file when an empty update rolls back', async () => {
    const comment = {
      id: '33',
      question_id: '5',
      user_id: '20',
      parent_id: null,
      content: 'Antes',
      deleted_at: null,
      images: [],
    } as QuestionComment;
    const { service, repository, storage } = setup(comment);
    repository.findImageIds.mockResolvedValue([
      { id: '9007199254740993', path: 'image.png' },
    ]);
    await expect(
      service.update(
        '5',
        '33',
        { content: '', removeImageIds: '9007199254740993' },
        [],
        student,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findImageIds).toHaveBeenCalledWith(
      '33',
      ['9007199254740993'],
      expect.anything(),
    );
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
