import { MigrationInterface, QueryRunner } from 'typeorm';

export class Itineraries1785428492751 implements MigrationInterface {
  name = 'Itineraries1785428492751';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "itineraries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "title" character varying NOT NULL, "destination_name" character varying NOT NULL, "days" integer NOT NULL, "budget_minor" integer, "party_size" integer NOT NULL DEFAULT '1', "interests" jsonb NOT NULL DEFAULT '[]', "plan" jsonb NOT NULL, "model" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c5db87d0f85f56e4466ae09a38" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c1f9990ff4b57b054ed85a45e" ON "itineraries"  ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c1f9990ff4b57b054ed85a45e"`,
    );
    await queryRunner.query(`DROP TABLE "itineraries"`);
  }
}
