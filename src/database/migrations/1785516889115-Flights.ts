import { MigrationInterface, QueryRunner } from 'typeorm';

export class Flights1785516889115 implements MigrationInterface {
  name = 'Flights1785516889115';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "flights" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "airline_code" character varying NOT NULL, "airline_name" character varying NOT NULL, "airline_logo_url" character varying, "origin" character varying(3) NOT NULL, "destination" character varying(3) NOT NULL, "departs_at" TIMESTAMP WITH TIME ZONE NOT NULL, "arrives_at" TIMESTAMP WITH TIME ZONE NOT NULL, "flight_number" character varying NOT NULL, "duration_minutes" integer NOT NULL, "stops" integer NOT NULL DEFAULT '0', "baggage_kg" integer, "refundable" boolean NOT NULL DEFAULT true, "amenities" jsonb NOT NULL DEFAULT '[]', "price_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "seats_available" integer NOT NULL DEFAULT '9', CONSTRAINT "PK_c614ef3382fdd70b6d6c2c8d8dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_111153665c6f7e989faa40d4fc" ON "flights"  ("origin", "destination") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."flight_offers_cabin_enum" AS ENUM('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST')`,
    );
    await queryRunner.query(
      `CREATE TABLE "flight_offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "flight_id" character varying NOT NULL, "cabin" "public"."flight_offers_cabin_enum" NOT NULL, "adults" integer NOT NULL DEFAULT '1', "children" integer NOT NULL DEFAULT '0', "infants" integer NOT NULL DEFAULT '0', "total_minor" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'GHS', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9100a6c5f9878eddf90100572d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_11ecf1eb8abbb4bb5b19e1252f" ON "flight_offers"  ("flight_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_11ecf1eb8abbb4bb5b19e1252f"`,
    );
    await queryRunner.query(`DROP TABLE "flight_offers"`);
    await queryRunner.query(`DROP TYPE "public"."flight_offers_cabin_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_111153665c6f7e989faa40d4fc"`,
    );
    await queryRunner.query(`DROP TABLE "flights"`);
  }
}
