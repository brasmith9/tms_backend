import { MigrationInterface, QueryRunner } from 'typeorm';

export class Stays1785507395129 implements MigrationInterface {
  name = 'Stays1785507395129';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stay_id" character varying NOT NULL, "name" character varying NOT NULL, "max_guests" integer NOT NULL, "bed" character varying NOT NULL, "price_per_night_minor" integer NOT NULL, "available" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d7e35e908e8200abd31cd7fa1f" ON "rooms"  ("stay_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stays_category_enum" AS ENUM('HOTEL', 'VILLA', 'HOSTEL', 'APARTMENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stays" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "category" "public"."stays_category_enum" NOT NULL, "location" character varying NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "stars" integer NOT NULL DEFAULT '3', "rating_avg" double precision NOT NULL DEFAULT '0', "rating_count" integer NOT NULL DEFAULT '0', "from_price_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "amenities" jsonb NOT NULL DEFAULT '[]', "images" jsonb NOT NULL DEFAULT '[]', "hero_image_url" character varying, "description" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ce4f236f2c6192cc72feb795f18" UNIQUE ("slug"), CONSTRAINT "PK_55e31a0cae0fd6ab1a9f3c6b593" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_36d48f3ed4d4b5c0a720200f01" ON "stays"  ("category") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_36d48f3ed4d4b5c0a720200f01"`,
    );
    await queryRunner.query(`DROP TABLE "stays"`);
    await queryRunner.query(`DROP TYPE "public"."stays_category_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d7e35e908e8200abd31cd7fa1f"`,
    );
    await queryRunner.query(`DROP TABLE "rooms"`);
  }
}
