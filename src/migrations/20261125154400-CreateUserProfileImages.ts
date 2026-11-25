import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserProfileImages20261125154400 implements MigrationInterface {
  name = 'CreateUserProfileImages20261125154400';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_profile_images',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'user_id', type: 'bigint', unsigned: true },
          { name: 'file_name', type: 'varchar', length: '255' },
          { name: 'mime_type', type: 'varchar', length: '100' },
          { name: 'image_data', type: 'longblob' },
          { name: 'file_size', type: 'int', unsigned: true },
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
      }),
    );
    await queryRunner.createIndex(
      'user_profile_images',
      new TableIndex({
        name: 'UQ_user_profile_images_user',
        columnNames: ['user_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'user_profile_images',
      new TableForeignKey({
        name: 'FK_user_profile_images_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_profile_images', true);
  }
}
