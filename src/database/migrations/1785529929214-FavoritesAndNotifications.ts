import { MigrationInterface, QueryRunner } from 'typeorm';

export class FavoritesAndNotifications1785529929214 implements MigrationInterface {
  name = 'FavoritesAndNotifications1785529929214';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."favorites_type_enum" AS ENUM('TOUR', 'STAY', 'RESTAURANT', 'DESTINATION')`,
    );
    await queryRunner.query(
      `CREATE TABLE "favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "type" "public"."favorites_type_enum" NOT NULL, "item_id" character varying NOT NULL, "snapshot" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_557e5fdef6222a4430af9e093d4" UNIQUE ("user_id", "type", "item_id"), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35a6b05ee3b624d0de01ee5059" ON "favorites"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "data" jsonb, "read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON "notifications"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8b7ed75170d2d7dca4477cc94" ON "notifications"  ("read") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8b7ed75170d2d7dca4477cc94"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a8a82462cab47c73d25f49261"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35a6b05ee3b624d0de01ee5059"`,
    );
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(`DROP TYPE "public"."favorites_type_enum"`);
  }
}
