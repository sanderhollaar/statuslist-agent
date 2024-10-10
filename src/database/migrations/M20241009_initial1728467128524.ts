
import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class M20241009_initial1728467128524 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    function getTableName(givenName: string): string {
        return (
            queryRunner.connection.entityMetadatas.find((meta) => meta.givenTableName === givenName)?.tableName ||
            givenName
        )
    }
  
    const dateTimeType: string = queryRunner.connection.driver.mappedDataTypes.createDate as string

    await queryRunner.createTable(
        new Table({
          name: getTableName('statuslist'),
          columns: [
            { name: 'id', type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: 'name', type: 'varchar', isNullable: false},
            { name: 'index', type: 'int', isNullable: false},
            { name: 'size', type: 'int', isNullable: false},
            { name: 'used', type: 'int', isNullable: false},
            { name: 'content', type: 'text', isNullable: false },
            { name: 'revoked', type: 'text', isNullable: false },
            { name: 'expirationDate', type: dateTimeType, isNullable: true },
            { name: 'saveDate', type: dateTimeType },
            { name: 'updateDate', type: dateTimeType },
          ],
        }),
        true,
      )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('statuslist')) {
        await queryRunner.dropTable('statuslist', true, true, true);
    }
  }
}
