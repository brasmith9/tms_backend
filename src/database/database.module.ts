import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // E2E runs against a throwaway database: build the schema from entities
        // and drop it each boot rather than running the compiled migrations.
        const isTest = process.env.NODE_ENV === 'test';
        return {
          type: 'postgres',
          url: config.get<string>('databaseUrl'),
          autoLoadEntities: true,
          synchronize: isTest,
          dropSchema: isTest,
          migrationsRun: !isTest,
          migrations: ['dist/database/migrations/*.js'],
        };
      },
    }),
  ],
})
export class DatabaseModule {}
