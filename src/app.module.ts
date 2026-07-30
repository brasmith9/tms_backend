import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, UsersModule],
})
export class AppModule {}
