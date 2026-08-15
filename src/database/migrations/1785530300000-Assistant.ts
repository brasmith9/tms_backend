import { MigrationInterface, QueryRunner } from 'typeorm';

export class Assistant1785530300000 implements MigrationInterface {
  name = 'Assistant1785530300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chat_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "title" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_chat_sessions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_sessions_user_id" ON "chat_sessions" ("user_id")`,
    );
    // Nullable + ON DELETE CASCADE: a guest session simply has no owner, and a
    // deleted account takes its chat history with it.
    await queryRunner.query(
      `ALTER TABLE "chat_sessions" ADD CONSTRAINT "FK_chat_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_role_enum" AS ENUM('USER', 'ASSISTANT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "role" "public"."chat_messages_role_enum" NOT NULL, "content" text NOT NULL, "actions" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_messages_session_id" ON "chat_messages" ("session_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_session_id" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TYPE "public"."chat_messages_role_enum"`);
    await queryRunner.query(`DROP TABLE "chat_sessions"`);
  }
}
