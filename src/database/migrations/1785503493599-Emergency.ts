import { MigrationInterface, QueryRunner } from 'typeorm';

export class Emergency1785503493599 implements MigrationInterface {
  name = 'Emergency1785503493599';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "emergency_contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "name" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying, "relationship" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8be191845b6fca1c4e5ba5bd7d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1cf39ea46db44d95b34d58d360" ON "emergency_contacts"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."medical_facilities_type_enum" AS ENUM('HOSPITAL', 'CLINIC', 'PHARMACY', 'POLICE', 'FIRE', 'EMBASSY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_facilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" "public"."medical_facilities_type_enum" NOT NULL, "description" text NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "phone" character varying NOT NULL, "open_24h" boolean NOT NULL DEFAULT false, "country" character varying NOT NULL DEFAULT 'GH', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a4ae6eec0df194ec9fffa1bebb3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f6a6069a0067102a8003fdf3d" ON "medical_facilities"  ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba0c06e6354723289c7de964e0" ON "medical_facilities"  ("country") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sos_alerts_kind_enum" AS ENUM('MEDICAL', 'SECURITY', 'FIRE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sos_alerts_status_enum" AS ENUM('ACTIVE', 'CANCELLED', 'RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sos_alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alert_id" character varying NOT NULL, "user_id" character varying NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "kind" "public"."sos_alerts_kind_enum" NOT NULL, "note" text, "status" "public"."sos_alerts_status_enum" NOT NULL DEFAULT 'ACTIVE', "notified_contacts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "cancelled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_819f32d2d4b131600b737aef41d" UNIQUE ("alert_id"), CONSTRAINT "PK_5c6f2f5f40ab2224315e007b9c4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a5209ca217c11fd1c5767d145" ON "sos_alerts"  ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a5209ca217c11fd1c5767d145"`,
    );
    await queryRunner.query(`DROP TABLE "sos_alerts"`);
    await queryRunner.query(`DROP TYPE "public"."sos_alerts_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sos_alerts_kind_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba0c06e6354723289c7de964e0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f6a6069a0067102a8003fdf3d"`,
    );
    await queryRunner.query(`DROP TABLE "medical_facilities"`);
    await queryRunner.query(
      `DROP TYPE "public"."medical_facilities_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1cf39ea46db44d95b34d58d360"`,
    );
    await queryRunner.query(`DROP TABLE "emergency_contacts"`);
  }
}
