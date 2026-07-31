import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentSource1785507089357 implements MigrationInterface {
    name = 'PaymentSource1785507089357'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payments_source_enum" AS ENUM('TOUR', 'RESERVATION')`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "source" "public"."payments_source_enum" NOT NULL DEFAULT 'TOUR'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."payments_source_enum"`);
    }

}
