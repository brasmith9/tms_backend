import 'reflect-metadata';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { OperatorProfile } from '../../modules/users/entities/operator-profile.entity';
import { Destination } from '../../modules/destinations/entities/destination.entity';
import { Tour } from '../../modules/tours/entities/tour.entity';
import { TourDeparture } from '../../modules/tours/entities/tour-departure.entity';
import {
  TourBooking,
  BookingStatus,
} from '../../modules/bookings/entities/tour-booking.entity';
import { SEED_PASSWORD, seedDestinations, seedTours, seedUsers } from './data';

async function seed(ds: DataSource): Promise<void> {
  const passwordHash = await argon2.hash(SEED_PASSWORD);

  // Users + operator profiles (idempotent by email).
  const userRepo = ds.getRepository(User);
  const profileRepo = ds.getRepository(OperatorProfile);
  const usersByEmail = new Map<string, User>();
  for (const u of seedUsers) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          email: u.email,
          passwordHash,
          fullName: u.fullName,
          role: u.role,
        }),
      );
      if (u.company) {
        await profileRepo.save(
          profileRepo.create({ user, companyName: u.company }),
        );
      }
      console.log(`+ user ${u.email} (${u.role})`);
    } else {
      console.log(`= user ${u.email} already present`);
    }
    usersByEmail.set(u.email, user);
  }

  // Destinations (idempotent by name).
  const destRepo = ds.getRepository(Destination);
  const destByName = new Map<string, Destination>();
  for (const d of seedDestinations) {
    let dest = await destRepo.findOne({ where: { name: d.name } });
    if (!dest) {
      dest = await destRepo.save(destRepo.create(d));
      console.log(`+ destination ${d.name}`);
    } else {
      console.log(`= destination ${d.name} already present`);
    }
    destByName.set(d.name, dest);
  }

  // Tours + one departure each (idempotent by slug).
  const tourRepo = ds.getRepository(Tour);
  const departureRepo = ds.getRepository(TourDeparture);
  const toursBySlug = new Map<string, Tour>();
  const departureByTourSlug = new Map<string, TourDeparture>();
  for (const t of seedTours) {
    let tour = await tourRepo.findOne({ where: { slug: t.slug } });
    if (!tour) {
      const dest = destByName.get(t.destination)!;
      const operator = usersByEmail.get(t.operator)!;
      tour = await tourRepo.save(
        tourRepo.create({
          slug: t.slug,
          title: t.title,
          description: t.description,
          priceMinor: t.priceMinor,
          currency: 'GHS',
          durationMinutes: t.durationMinutes,
          status: t.status,
          operatorId: operator.id,
          destinationId: dest.id,
        }),
      );
      const departsAt = new Date(
        Date.now() + t.departureDaysFromNow * 24 * 60 * 60 * 1000,
      );
      const departure = await departureRepo.save(
        departureRepo.create({
          tourId: tour.id,
          departsAt,
          capacity: t.capacity,
        }),
      );
      departureByTourSlug.set(t.slug, departure);
      console.log(`+ tour ${t.slug} (+1 departure)`);
    } else {
      console.log(`= tour ${t.slug} already present`);
      const existing = await departureRepo.findOne({
        where: { tourId: tour.id },
      });
      if (existing) departureByTourSlug.set(t.slug, existing);
    }
    toursBySlug.set(t.slug, tour);
  }

  // A few demo bookings for the tourist across the three tabs.
  const bookingRepo = ds.getRepository(TourBooking);
  const tourist = usersByEmail.get('kofi@voyago.test')!;
  const demoBookings = [
    {
      slug: 'kakum-canopy-walk',
      ref: 'TUR-2026-9001',
      status: BookingStatus.CONFIRMED,
    },
    {
      slug: 'cape-coast-castle-tour',
      ref: 'TUR-2026-9002',
      status: BookingStatus.COMPLETED,
    },
    {
      slug: 'mole-safari-tour',
      ref: 'TUR-2026-9003',
      status: BookingStatus.CANCELLED,
    },
  ];
  for (const b of demoBookings) {
    const existing = await bookingRepo.findOne({ where: { reference: b.ref } });
    if (existing) {
      console.log(`= booking ${b.ref} already present`);
      continue;
    }
    const tour = toursBySlug.get(b.slug)!;
    const departure = departureByTourSlug.get(b.slug);
    if (!departure) continue;
    await bookingRepo.save(
      bookingRepo.create({
        reference: b.ref,
        touristId: tourist.id,
        departureId: departure.id,
        seats: 1,
        unitPriceMinor: tour.priceMinor,
        totalMinor: tour.priceMinor,
        currency: 'GHS',
        status: b.status,
        cancelledAt:
          b.status === BookingStatus.CANCELLED ? new Date() : undefined,
      }),
    );
    console.log(`+ booking ${b.ref} (${b.status})`);
  }
}

async function main(): Promise<void> {
  const ds = await dataSource.initialize();
  try {
    await seed(ds);
    console.log('Seed complete.');
  } finally {
    await ds.destroy();
  }
}

void main();
