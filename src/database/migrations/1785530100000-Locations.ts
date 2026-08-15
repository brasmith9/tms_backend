import { MigrationInterface, QueryRunner } from 'typeorm';

export class Locations1785530100000 implements MigrationInterface {
  name = 'Locations1785530100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."locations_category_enum" AS ENUM('LECTURE_HALL', 'DEPARTMENT', 'PARK_FIELD', 'HOSTEL_HALL', 'ADMINISTRATION', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "category" "public"."locations_category_enum" NOT NULL, "description" text, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "photos" jsonb NOT NULL DEFAULT '[]', "building_notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_locations_slug" UNIQUE ("slug"), CONSTRAINT "PK_locations_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_category" ON "locations" ("category")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_locations_category"`);
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TYPE "public"."locations_category_enum"`);
  }
}
