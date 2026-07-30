import { MigrationInterface, QueryRunner } from 'typeorm';

export class Tours1785393483335 implements MigrationInterface {
  name = 'Tours1785393483335';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tour_departures_status_enum" AS ENUM('SCHEDULED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tour_departures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tour_id" character varying NOT NULL, "departs_at" TIMESTAMP WITH TIME ZONE NOT NULL, "capacity" integer NOT NULL, "status" "public"."tour_departures_status_enum" NOT NULL DEFAULT 'SCHEDULED', CONSTRAINT "PK_5499d53430d54ba9b6a0d902ca2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e25567e8840d94772a33fc26e7" ON "tour_departures"  ("tour_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tours_status_enum" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tours" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "operator_id" character varying NOT NULL, "destination_id" character varying NOT NULL, "title" character varying NOT NULL, "slug" character varying NOT NULL, "description" text NOT NULL, "price_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "duration_minutes" integer NOT NULL, "status" "public"."tours_status_enum" NOT NULL DEFAULT 'DRAFT', "hero_image_url" character varying, "rating_avg" double precision NOT NULL DEFAULT '0', "rating_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_233c6bf8b7c2c897c6eed5373a6" UNIQUE ("slug"), CONSTRAINT "PK_2202ba445792c1ad0edf2de8de2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e27f36f709246ddd251fae66c" ON "tours"  ("operator_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d0ca2ba62165fba61ce11c8e5c" ON "tours"  ("destination_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d0ca2ba62165fba61ce11c8e5c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e27f36f709246ddd251fae66c"`,
    );
    await queryRunner.query(`DROP TABLE "tours"`);
    await queryRunner.query(`DROP TYPE "public"."tours_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e25567e8840d94772a33fc26e7"`,
    );
    await queryRunner.query(`DROP TABLE "tour_departures"`);
    await queryRunner.query(`DROP TYPE "public"."tour_departures_status_enum"`);
  }
}
