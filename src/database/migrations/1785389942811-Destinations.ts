import { MigrationInterface, QueryRunner } from 'typeorm';

export class Destinations1785389942811 implements MigrationInterface {
  name = 'Destinations1785389942811';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "destinations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "region" character varying NOT NULL, "country" character varying NOT NULL DEFAULT 'Ghana', "description" text NOT NULL, "hero_image_url" character varying, "lat" double precision, "lng" double precision, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_69c5e8db964dcb83d3a0640f3c7" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "destinations"`);
  }
}
