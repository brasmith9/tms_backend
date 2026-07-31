import { MigrationInterface, QueryRunner } from "typeorm";

export class Reservations1785505280881 implements MigrationInterface {
    name = 'Reservations1785505280881'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."reservations_type_enum" AS ENUM('STAY', 'FLIGHT', 'TABLE')`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "user_id" character varying NOT NULL, "type" "public"."reservations_type_enum" NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'PENDING', "total_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "item" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "cancelled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_12c605ea41137000c9c0aeca9ce" UNIQUE ("reference"), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4af5055a871c46d011345a255a" ON "reservations"  ("user_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_4af5055a871c46d011345a255a"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_type_enum"`);
    }

}
