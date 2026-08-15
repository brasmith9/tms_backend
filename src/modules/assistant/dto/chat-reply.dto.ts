import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantResponseDto } from '../../food/dto/restaurant-response.dto';
import { LocationResponseDto } from '../../locations/dto/location-response.dto';
import type { AssistantAction } from '../assistant-action';

export type ResultKind = 'LOCATION' | 'FOOD_JOINT';

export class AssistantResultGroupDto {
  @ApiProperty({ enum: ['LOCATION', 'FOOD_JOINT'] }) kind!: ResultKind;
  @ApiProperty({
    description:
      'LocationResponseDto[] for LOCATION, RestaurantResponseDto[] for FOOD_JOINT',
    isArray: true,
  })
  items!: (LocationResponseDto | RestaurantResponseDto)[];
}

export class ChatReplyDto {
  @ApiProperty() sessionId!: string;
  @ApiProperty() reply!: string;
  @ApiProperty({
    description:
      'Closed, server-validated set. Anything the model invented has already ' +
      'been dropped, so every entry resolves to a real record.',
    isArray: true,
  })
  actions!: AssistantAction[];
  @ApiPropertyOptional({ type: [AssistantResultGroupDto] })
  results?: AssistantResultGroupDto[];
}
