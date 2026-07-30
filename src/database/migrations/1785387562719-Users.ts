import { MigrationInterface, QueryRunner } from 'typeorm';

export class Users1785387562719 implements MigrationInterface {
  name = 'Users1785387562719';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('TOURIST', 'OPERATOR', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying NOT NULL, "phone" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'TOURIST', "loyalty_points" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operator_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_name" character varying NOT NULL, "verified_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid, CONSTRAINT "REL_6af4492922b7b206e39163b644" UNIQUE ("user_id"), CONSTRAINT "PK_484f29fdc6cb7e6d5e791b759f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_profiles" ADD CONSTRAINT "FK_6af4492922b7b206e39163b6445" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operator_profiles" DROP CONSTRAINT "FK_6af4492922b7b206e39163b6445"`,
    );
    await queryRunner.query(`DROP TABLE "operator_profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
