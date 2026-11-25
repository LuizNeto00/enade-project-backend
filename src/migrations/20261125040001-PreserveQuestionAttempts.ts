import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class PreserveQuestionAttempts20261125040001 implements MigrationInterface {
  name = 'PreserveQuestionAttempts20261125040001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'question_attempts',
      'question_id',
      new TableColumn({
        name: 'question_id',
        type: 'bigint',
        unsigned: true,
        isNullable: true,
      }),
    );

    await queryRunner.addColumns('question_attempts', [
      new TableColumn({
        name: 'correct_option',
        type: 'varchar',
        length: '1',
        isNullable: false,
        default: "'A'",
      }),
      new TableColumn({
        name: 'question_snapshot',
        type: 'longtext',
        isNullable: true,
      }),
    ]);

    await queryRunner.query(`
      UPDATE question_attempts attempt
      LEFT JOIN questions question ON question.id = attempt.question_id
      SET
        attempt.correct_option = COALESCE(question.correct_option, 'A'),
        attempt.question_snapshot = CASE
          WHEN question.id IS NULL THEN attempt.question_snapshot
          ELSE JSON_OBJECT(
            'id', question.id,
            'statement', question.statement,
            'course', question.course,
            'examYear', question.exam_year,
            'level', question.level,
            'optionCount', question.option_count,
            'options', CASE
              WHEN question.option_count = 5 THEN JSON_ARRAY(
                JSON_OBJECT('label', 'A', 'text', question.option_a),
                JSON_OBJECT('label', 'B', 'text', question.option_b),
                JSON_OBJECT('label', 'C', 'text', question.option_c),
                JSON_OBJECT('label', 'D', 'text', question.option_d),
                JSON_OBJECT('label', 'E', 'text', question.option_e)
              )
              ELSE JSON_ARRAY(
                JSON_OBJECT('label', 'A', 'text', question.option_a),
                JSON_OBJECT('label', 'B', 'text', question.option_b),
                JSON_OBJECT('label', 'C', 'text', question.option_c),
                JSON_OBJECT('label', 'D', 'text', question.option_d)
              )
            END,
            'correctOption', question.correct_option,
            'answerComment', question.answer_comment
          )
        END
    `);

    const table = await queryRunner.getTable('question_attempts');
    const oldQuestionForeignKey = table?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('question_id'),
    );
    if (oldQuestionForeignKey) {
      await queryRunner.dropForeignKey(
        'question_attempts',
        oldQuestionForeignKey,
      );
    }
    await queryRunner.createForeignKey(
      'question_attempts',
      new TableForeignKey({
        name: 'FK_question_attempts_question',
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('question_attempts');
    const foreignKey = table?.foreignKeys.find(
      (item) => item.name === 'FK_question_attempts_question',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('question_attempts', foreignKey);
    }
    await queryRunner.dropColumns('question_attempts', [
      'correct_option',
      'question_snapshot',
    ]);
    await queryRunner.changeColumn(
      'question_attempts',
      'question_id',
      new TableColumn({
        name: 'question_id',
        type: 'bigint',
        unsigned: true,
        isNullable: false,
      }),
    );
  }
}
