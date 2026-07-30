import { MigrationInterface, QueryRunner } from 'typeorm';

export class Payments1785398981446 implements MigrationInterface {
  name = 'Payments1785398981446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" character varying NOT NULL, "provider_ref" character varying NOT NULL, "amount_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "authorization_url" character varying, "raw_event" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f4b4af0e4dc1ec56503cd1288c3" UNIQUE ("provider_ref"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e86edf76dc2424f123b9023a2b" ON "payments"  ("booking_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e86edf76dc2424f123b9023a2b"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
  }
}
