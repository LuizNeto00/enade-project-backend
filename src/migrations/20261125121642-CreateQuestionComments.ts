import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateQuestionComments20261125121642 implements MigrationInterface {
  name = 'CreateQuestionComments20261125121642';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'question_comments',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'question_id', type: 'bigint', unsigned: true },
          { name: 'user_id', type: 'bigint', unsigned: true },
          {
            name: 'parent_id',
            type: 'bigint',
            unsigned: true,
            isNullable: true,
          },
          { name: 'content', type: 'text', isNullable: true },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'question_comments',
      new TableForeignKey({
        name: 'FK_question_comments_question',
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'question_comments',
      new TableForeignKey({
        name: 'FK_question_comments_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'question_comments',
      new TableForeignKey({
        name: 'FK_question_comments_parent',
        columnNames: ['parent_id'],
        referencedTableName: 'question_comments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'question_comments',
      new TableIndex({
        name: 'IDX_question_comments_question_parent',
        columnNames: ['question_id', 'parent_id', 'created_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'question_comment_images',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'comment_id', type: 'bigint', unsigned: true },
          { name: 'path', type: 'varchar', length: '1024' },
          { name: 'original_name', type: 'varchar', length: '255' },
          { name: 'mime_type', type: 'varchar', length: '100' },
          { name: 'size', type: 'int', unsigned: true },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'question_comment_images',
      new TableForeignKey({
        name: 'FK_comment_images_comment',
        columnNames: ['comment_id'],
        referencedTableName: 'question_comments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'question_comment_mentions',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'comment_id', type: 'bigint', unsigned: true },
          { name: 'mentioned_user_id', type: 'bigint', unsigned: true },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            name: 'UQ_comment_mentions',
            columnNames: ['comment_id', 'mentioned_user_id'],
          },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'question_comment_mentions',
      new TableForeignKey({
        name: 'FK_comment_mentions_comment',
        columnNames: ['comment_id'],
        referencedTableName: 'question_comments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'question_comment_mentions',
      new TableForeignKey({
        name: 'FK_comment_mentions_user',
        columnNames: ['mentioned_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('question_comment_mentions', true);
    await queryRunner.dropTable('question_comment_images', true);
    await queryRunner.dropTable('question_comments', true);
  }
}
