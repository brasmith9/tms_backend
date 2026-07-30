import { MigrationInterface, QueryRunner } from 'typeorm';

export class Reviews1785399648333 implements MigrationInterface {
  name = 'Reviews1785399648333';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tour_id" character varying NOT NULL, "booking_id" character varying NOT NULL, "author_id" character varying NOT NULL, "rating" integer NOT NULL, "body" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bbd6ac6e3e6a8f8c6e0e8692d63" UNIQUE ("booking_id"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad8f030e70663afeb8b9e3c325" ON "reviews"  ("tour_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad8f030e70663afeb8b9e3c325"`,
    );
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
