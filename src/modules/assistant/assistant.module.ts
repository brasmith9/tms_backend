import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodModule } from '../food/food.module';
import { LocationsModule } from '../locations/locations.module';
import { AssistantController } from './assistant.controller';
import { ASSISTANT_PORT } from './assistant.port';
import { AssistantRepository } from './assistant.repository';
import { AssistantService } from './assistant.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { OpenRouterAssistant } from './openrouter.assistant';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
    LocationsModule,
    FoodModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantRepository,
    { provide: ASSISTANT_PORT, useClass: OpenRouterAssistant },
  ],
})
export class AssistantModule {}
