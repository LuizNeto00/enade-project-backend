import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateQuestionAttemptsTable20261125040000 implements MigrationInterface {
  name = 'CreateQuestionAttemptsTable20261125040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'question_attempts',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            unsigned: true,
          },
          {
            name: 'question_id',
            type: 'bigint',
            unsigned: true,
          },
          {
            name: 'student_id',
            type: 'bigint',
            unsigned: true,
          },
          {
            name: 'selected_option',
            type: 'varchar',
            length: '1',
          },
          {
            name: 'is_correct',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'answered_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'question_attempts',
      new TableForeignKey({
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );
    await queryRunner.createForeignKey(
      'question_attempts',
      new TableForeignKey({
        columnNames: ['student_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );
    await queryRunner.createIndex(
      'question_attempts',
      new TableIndex({
        name: 'IDX_question_attempts_question_student_answered',
        columnNames: ['question_id', 'student_id', 'answered_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('question_attempts', true);
  }
}
