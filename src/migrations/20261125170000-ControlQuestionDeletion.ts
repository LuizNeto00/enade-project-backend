import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class ControlQuestionDeletion20261125170000 implements MigrationInterface {
  name = 'ControlQuestionDeletion20261125170000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'question_comments',
      'FK_question_comments_question',
    );
    await queryRunner.changeColumn(
      'question_comments',
      'question_id',
      new TableColumn({
        name: 'question_id',
        type: 'bigint',
        unsigned: true,
        isNullable: true,
      }),
    );
    await queryRunner.createForeignKey(
      'question_comments',
      new TableForeignKey({
        name: 'FK_question_comments_question',
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await this.replaceForeignKey(
      queryRunner,
      'question_comment_images',
      'FK_comment_images_comment',
      ['comment_id'],
      'question_comments',
      ['id'],
    );
    await this.replaceForeignKey(
      queryRunner,
      'question_comment_mentions',
      'FK_comment_mentions_comment',
      ['comment_id'],
      'question_comments',
      ['id'],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [detachedComments] = (await queryRunner.query(
      'SELECT COUNT(*) AS count FROM question_comments WHERE question_id IS NULL',
    )) as [{ count: string }];
    if (Number(detachedComments.count) > 0) {
      throw new Error(
        'Cannot restore required question references while detached comments exist.',
      );
    }

    await this.replaceForeignKey(
      queryRunner,
      'question_comment_mentions',
      'FK_comment_mentions_comment',
      ['comment_id'],
      'question_comments',
      ['id'],
      'CASCADE',
    );
    await this.replaceForeignKey(
      queryRunner,
      'question_comment_images',
      'FK_comment_images_comment',
      ['comment_id'],
      'question_comments',
      ['id'],
      'CASCADE',
    );

    await queryRunner.dropForeignKey(
      'question_comments',
      'FK_question_comments_question',
    );
    await queryRunner.changeColumn(
      'question_comments',
      'question_id',
      new TableColumn({
        name: 'question_id',
        type: 'bigint',
        unsigned: true,
        isNullable: false,
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
  }

  private async replaceForeignKey(
    queryRunner: QueryRunner,
    tableName: string,
    foreignKeyName: string,
    columnNames: string[],
    referencedTableName: string,
    referencedColumnNames: string[],
    onDelete: 'CASCADE' | 'RESTRICT' = 'RESTRICT',
  ): Promise<void> {
    await queryRunner.dropForeignKey(tableName, foreignKeyName);
    await queryRunner.createForeignKey(
      tableName,
      new TableForeignKey({
        name: foreignKeyName,
        columnNames,
        referencedTableName,
        referencedColumnNames,
        onDelete,
      }),
    );
  }
}
