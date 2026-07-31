import { MigrationInterface, QueryRunner } from 'typeorm';

export class Restaurants1785506021850 implements MigrationInterface {
  name = 'Restaurants1785506021850';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "restaurants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "cuisine" character varying NOT NULL, "price_tier" integer NOT NULL, "description" text NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "hero_image_url" character varying, "images" jsonb NOT NULL DEFAULT '[]', "dietary" jsonb NOT NULL DEFAULT '[]', "opening_hours" jsonb NOT NULL DEFAULT '[]', "menu" jsonb NOT NULL DEFAULT '[]', "rating_avg" double precision NOT NULL DEFAULT '0', "rating_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_afb6330c019768b4c3f9a65303c" UNIQUE ("slug"), CONSTRAINT "PK_e2133a72eb1cc8f588f7b503e68" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_57ce60693a509ee89a6dba0ce2" ON "restaurants"  ("cuisine") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_57ce60693a509ee89a6dba0ce2"`,
    );
    await queryRunner.query(`DROP TABLE "restaurants"`);
  }
}
