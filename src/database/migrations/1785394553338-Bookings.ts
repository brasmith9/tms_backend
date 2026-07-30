import { MigrationInterface, QueryRunner } from 'typeorm';

export class Bookings1785394553338 implements MigrationInterface {
  name = 'Bookings1785394553338';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tour_bookings_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tour_bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "tourist_id" character varying NOT NULL, "departure_id" character varying NOT NULL, "seats" integer NOT NULL, "unit_price_minor" integer NOT NULL, "total_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "status" "public"."tour_bookings_status_enum" NOT NULL DEFAULT 'PENDING', "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3d0adf06b7c22f1561f1996c592" UNIQUE ("reference"), CONSTRAINT "PK_68c8fe889e3f8e65cd2df0a496f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_02a90bcc61033d1ccced8a81e1" ON "tour_bookings"  ("tourist_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92bf1e166647c0c39f6d48fb11" ON "tour_bookings"  ("departure_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92bf1e166647c0c39f6d48fb11"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_02a90bcc61033d1ccced8a81e1"`,
    );
    await queryRunner.query(`DROP TABLE "tour_bookings"`);
    await queryRunner.query(`DROP TYPE "public"."tour_bookings_status_enum"`);
  }
}
