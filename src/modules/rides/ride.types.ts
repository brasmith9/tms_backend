export enum VehicleType {
  TAXI = 'TAXI',
  CAR_HIRE = 'CAR_HIRE',
  SHUTTLE = 'SHUTTLE',
  BUS = 'BUS',
}

export enum RideStatus {
  REQUESTED = 'REQUESTED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  ARRIVING = 'ARRIVING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

/** Base fare + per-km rate (pesewas) by vehicle type. */
export const FARE_TABLE: Record<
  VehicleType,
  { baseMinor: number; perKmMinor: number }
> = {
  [VehicleType.TAXI]: { baseMinor: 1000, perKmMinor: 350 },
  [VehicleType.CAR_HIRE]: { baseMinor: 2000, perKmMinor: 500 },
  [VehicleType.SHUTTLE]: { baseMinor: 800, perKmMinor: 200 },
  [VehicleType.BUS]: { baseMinor: 500, perKmMinor: 120 },
};
