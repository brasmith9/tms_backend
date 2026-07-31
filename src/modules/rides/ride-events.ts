import { RideStatus } from './ride.types';

export const RIDE_STATUS_CHANGED = 'ride.status_changed';
export const RIDE_DRIVER_MOVED = 'ride.driver_moved';

export interface RideStatusChangedEvent {
  rideId: string;
  status: RideStatus;
  changedAt: string;
}

export interface RideDriverMovedEvent {
  rideId: string;
  lat: number;
  lng: number;
  bearing: number;
  etaMinutes: number;
}
