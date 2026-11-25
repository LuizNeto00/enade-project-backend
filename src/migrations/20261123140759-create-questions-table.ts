import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateQuestionsTable20261123140759 implements MigrationInterface {
  name = 'CreateQuestionsTable20261123140759';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'questions',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment', unsigned: true },
          { name: 'teacher_id', type: 'bigint', unsigned: true },
          { name: 'status', type: 'enum', enum: ['active', 'inactive'], default: "'active'"},
          { name: 'statement', type: 'longtext' },
          { name: 'course', type: 'varchar', length: '255' },
          { name: 'exam_year', type: 'int' },
          { name: 'level', type: 'enum', enum: ['easy', 'medium', 'hard'] },
          { name: 'option_count', type: 'tinyint' },
          { name: 'option_a', type: 'longtext' },
          { name: 'option_b', type: 'longtext' },
          { name: 'option_c', type: 'longtext' },
          { name: 'option_d', type: 'longtext' },
          { name: 'option_e', type: 'longtext', isNullable: true },
          { name: 'correct_option', type: 'varchar', length: '1' },
          { name: 'answer_comment', type: 'longtext' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        columnNames: ['teacher_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'question_images',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment', unsigned: true },
          { name: 'question_id', type: 'bigint', unsigned: true, isNullable: true },
          { name: 'field', type: 'varchar', length: '30' },
          { name: 'path', type: 'varchar', length: '1024' },
          { name: 'mime_type', type: 'varchar', length: '100' },
          { name: 'size', type: 'int', unsigned: true },
          { name: 'name', type: 'varchar', length: '255', isNullable: true },
          { name: 'key', type: 'varchar', length: '100', isUnique: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'question_images',
      new TableForeignKey({
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('question_images', true);
    await queryRunner.dropTable('questions', true);
  }
}
