import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class CommentHardDeleteAndEditedAt20261125142000 implements MigrationInterface {
  name = 'CommentHardDeleteAndEditedAt20261125142000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'question_comments',
      new TableColumn({
        name: 'edited_at',
        type: 'datetime',
        isNullable: true,
      }),
    );
    await queryRunner.dropForeignKey(
      'question_comments',
      'FK_question_comments_parent',
    );
    await queryRunner.createForeignKey(
      'question_comments',
      new TableForeignKey({
        name: 'FK_question_comments_parent',
        columnNames: ['parent_id'],
        referencedTableName: 'question_comments',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'question_comments',
      'FK_question_comments_parent',
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
    await queryRunner.dropColumn('question_comments', 'edited_at');
  }
}
