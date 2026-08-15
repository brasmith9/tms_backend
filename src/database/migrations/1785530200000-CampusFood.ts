import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampusFood1785530200000 implements MigrationInterface {
  name = 'CampusFood1785530200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // VENDOR joins the role enum. Recreating the type rather than ALTER TYPE ...
    // ADD VALUE, because the latter cannot be used in the same transaction that
    // adds it — and TypeORM runs each migration in one.
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

    // Contact details. contact_consent defaults to false so the twenty rows that
    // predate this migration publish nothing until a vendor opts in.
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "phone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "whatsapp" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "email" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "contact_consent" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`ALTER TABLE "restaurants" ADD "owner_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurants_owner_id" ON "restaurants" ("owner_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD CONSTRAINT "FK_restaurants_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD "nearest_location_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurants_nearest_location_id" ON "restaurants" ("nearest_location_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD CONSTRAINT "FK_restaurants_nearest_location_id" FOREIGN KEY ("nearest_location_id") REFERENCES "locations"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE "restaurant_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurant_id" uuid NOT NULL, "author_id" uuid NOT NULL, "rating" integer NOT NULL, "body" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_restaurant_reviews_restaurant_author" UNIQUE ("restaurant_id", "author_id"), CONSTRAINT "PK_restaurant_reviews_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_restaurant_reviews_restaurant_id" ON "restaurant_reviews" ("restaurant_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "FK_restaurant_reviews_restaurant_id" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "FK_restaurant_reviews_author_id" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "restaurant_reviews"`);

    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP CONSTRAINT "FK_restaurants_nearest_location_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_restaurants_nearest_location_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP COLUMN "nearest_location_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP CONSTRAINT "FK_restaurants_owner_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_restaurants_owner_id"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "owner_id"`);

    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP COLUMN "contact_consent"`,
    );
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "whatsapp"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "phone"`);

    // Any VENDOR accounts have to land somewhere the old enum accepts.
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'OPERATOR' WHERE "role" = 'VENDOR'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('TOURIST', 'OPERATOR', 'ADMIN')`,
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
