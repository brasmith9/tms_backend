import { MigrationInterface, QueryRunner } from 'typeorm';

export class Rides1785528940334 implements MigrationInterface {
  name = 'Rides1785528940334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."drivers_vehicle_type_enum" AS ENUM('TAXI', 'CAR_HIRE', 'SHUTTLE', 'BUS')`,
    );
    await queryRunner.query(
      `CREATE TABLE "drivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phone" character varying NOT NULL, "rating" double precision NOT NULL DEFAULT '4.8', "vehicle_type" "public"."drivers_vehicle_type_enum" NOT NULL, "vehicle_make" character varying NOT NULL, "vehicle_model" character varying NOT NULL, "vehicle_plate" character varying NOT NULL, "vehicle_color" character varying NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "available" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a1d63dac8b54a17b2cadcd1fe" ON "drivers"  ("vehicle_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d3270cad47d796cad6822b4d5b" ON "drivers"  ("available") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ride_quotes_vehicle_type_enum" AS ENUM('TAXI', 'CAR_HIRE', 'SHUTTLE', 'BUS')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ride_quotes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vehicle_type" "public"."ride_quotes_vehicle_type_enum" NOT NULL, "pickup" jsonb NOT NULL, "dropoff" jsonb NOT NULL, "fare_minor" integer NOT NULL, "eta_minutes" integer NOT NULL, "surge_multiplier" double precision NOT NULL DEFAULT '1', "currency" character varying NOT NULL DEFAULT 'GHS', "scheduled_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1d197b5f5a1e42e0f1ff2787ad6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rides_status_enum" AS ENUM('REQUESTED', 'DRIVER_ASSIGNED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rides_vehicle_type_enum" AS ENUM('TAXI', 'CAR_HIRE', 'SHUTTLE', 'BUS')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rides" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "status" "public"."rides_status_enum" NOT NULL DEFAULT 'REQUESTED', "vehicle_type" "public"."rides_vehicle_type_enum" NOT NULL, "pickup" jsonb NOT NULL, "dropoff" jsonb NOT NULL, "fare_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "driver_id" character varying, "driver_lat" double precision, "driver_lng" double precision, "eta_minutes" integer, "scheduled_at" TIMESTAMP WITH TIME ZONE, "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ca6f62fc1e999b139c7f28f07fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f6c61335b9ffef3ca793b7439" ON "rides"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb13184768dea9734b022874c6" ON "rides"  ("driver_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb13184768dea9734b022874c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f6c61335b9ffef3ca793b7439"`,
    );
    await queryRunner.query(`DROP TABLE "rides"`);
    await queryRunner.query(`DROP TYPE "public"."rides_vehicle_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rides_status_enum"`);
    await queryRunner.query(`DROP TABLE "ride_quotes"`);
    await queryRunner.query(
      `DROP TYPE "public"."ride_quotes_vehicle_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d3270cad47d796cad6822b4d5b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a1d63dac8b54a17b2cadcd1fe"`,
    );
    await queryRunner.query(`DROP TABLE "drivers"`);
    await queryRunner.query(`DROP TYPE "public"."drivers_vehicle_type_enum"`);
  }
}
