import { ApiProperty } from '@nestjs/swagger';
import { pesewasToCedis } from '../../../common/money';
import { Flight } from '../entities/flight.entity';
import { FlightOffer } from '../entities/flight-offer.entity';

export class OfferResponseDto {
  @ApiProperty() offerId!: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { code: 'AW', name: 'Africa World Airlines', logoUrl: null },
  })
  airline!: { code: string; name: string; logoUrl?: string };
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  segments!: {
    origin: string;
    destination: string;
    departsAt: string;
    arrivesAt: string;
    flightNumber: string;
    durationMinutes: number;
  }[];
  @ApiProperty({ example: 0 }) stops!: number;
  @ApiProperty({ example: 'ECONOMY' }) cabin!: string;
  @ApiProperty({ description: 'Total fare in GHS for all passengers' })
  total!: number;
  @ApiProperty({ example: 'GHS' }) currency!: string;
  @ApiProperty({ required: false }) baggageKg?: number;
  @ApiProperty() refundable!: boolean;
  @ApiProperty({ type: [String] }) amenities!: string[];
  @ApiProperty({ description: 'ISO — book before this or the fare is stale' })
  expiresAt!: string;

  static from(offer: FlightOffer, flight: Flight): OfferResponseDto {
    const dto = new OfferResponseDto();
    dto.offerId = offer.id;
    dto.airline = {
      code: flight.airlineCode,
      name: flight.airlineName,
      logoUrl: flight.airlineLogoUrl,
    };
    dto.segments = [
      {
        origin: flight.origin,
        destination: flight.destination,
        departsAt: flight.departsAt.toISOString(),
        arrivesAt: flight.arrivesAt.toISOString(),
        flightNumber: flight.flightNumber,
        durationMinutes: flight.durationMinutes,
      },
    ];
    dto.stops = flight.stops;
    dto.cabin = offer.cabin;
    dto.total = pesewasToCedis(offer.totalMinor);
    dto.currency = offer.currency;
    dto.baggageKg = flight.baggageKg;
    dto.refundable = flight.refundable;
    dto.amenities = flight.amenities;
    dto.expiresAt = offer.expiresAt.toISOString();
    return dto;
  }
}
