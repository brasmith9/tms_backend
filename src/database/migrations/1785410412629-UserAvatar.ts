import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatar1785410412629 implements MigrationInterface {
  name = 'UserAvatar1785410412629';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar_url" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
  }
}
