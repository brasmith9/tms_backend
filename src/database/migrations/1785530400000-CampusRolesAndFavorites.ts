import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SRS 2.3 user classes and the LOCATION favourite type. Both enums are widened,
 * never renamed — TOURIST and OPERATOR still carry every existing tour booking.
 */
export class CampusRolesAndFavorites1785530400000 implements MigrationInterface {
  name = 'CampusRolesAndFavorites1785530400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('TOURIST', 'OPERATOR', 'STUDENT', 'STAFF', 'VISITOR', 'VENDOR', 'ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TOURIST'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);

    await queryRunner.query(
      `ALTER TYPE "public"."favorites_type_enum" RENAME TO "favorites_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."favorites_type_enum" AS ENUM('TOUR', 'STAY', 'RESTAURANT', 'DESTINATION', 'LOCATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "type" TYPE "public"."favorites_type_enum" USING "type"::"text"::"public"."favorites_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."favorites_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Saved campus locations have no home in the old enum.
    await queryRunner.query(
      `DELETE FROM "favorites" WHERE "type" = 'LOCATION'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."favorites_type_enum" RENAME TO "favorites_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."favorites_type_enum" AS ENUM('TOUR', 'STAY', 'RESTAURANT', 'DESTINATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "type" TYPE "public"."favorites_type_enum" USING "type"::"text"::"public"."favorites_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."favorites_type_enum_old"`);

    // Campus classes collapse back to the nearest tourism equivalent.
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'TOURIST' WHERE "role" IN ('STUDENT', 'STAFF', 'VISITOR')`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('TOURIST', 'OPERATOR', 'VENDOR', 'ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TOURIST'`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }
}
