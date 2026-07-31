import { ReservationType } from './entities/reservation.entity';

const PREFIX: Record<ReservationType, string> = {
  [ReservationType.STAY]: 'STY',
  [ReservationType.FLIGHT]: 'FLT',
  [ReservationType.TABLE]: 'TBL',
};

export function reservationReference(
  type: ReservationType,
  seq: number,
  year: number,
): string {
  return `${PREFIX[type]}-${year}-${seq.toString().padStart(4, '0')}`;
}
