import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMockExams20261125040002 implements MigrationInterface {
  name = 'CreateMockExams20261125040002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mock_exams',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teacher_id', type: 'bigint', unsigned: true },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'course', type: 'varchar', length: '255' },
          { name: 'exam_year', type: 'int' },
          { name: 'exam_pdf_path', type: 'varchar', length: '1024' },
          { name: 'answer_key_pdf_path', type: 'varchar', length: '1024' },
          { name: 'exam_pdf_name', type: 'varchar', length: '255' },
          { name: 'answer_key_pdf_name', type: 'varchar', length: '255' },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive'],
            default: "'active'",
          },
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
        ],
        foreignKeys: [
          {
            name: 'FK_mock_exams_teacher',
            columnNames: ['teacher_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_mock_exams_teacher_created',
            columnNames: ['teacher_id', 'created_at'],
          },
          {
            name: 'IDX_mock_exams_status',
            columnNames: ['status'],
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'mock_exam_completions',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'mock_exam_id', type: 'bigint', unsigned: true },
          { name: 'student_id', type: 'bigint', unsigned: true },
          {
            name: 'completed_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            name: 'UQ_mock_exam_completions_exam_student',
            columnNames: ['mock_exam_id', 'student_id'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_mock_exam_completions_exam',
            columnNames: ['mock_exam_id'],
            referencedTableName: 'mock_exams',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_mock_exam_completions_student',
            columnNames: ['student_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mock_exam_completions', true);
    await queryRunner.dropTable('mock_exams', true);
  }
}
