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
import { MedicalFacility } from '../../modules/emergency/entities/medical-facility.entity';
import { Restaurant } from '../../modules/food/entities/restaurant.entity';
import { Stay } from '../../modules/stays/entities/stay.entity';
import { Room } from '../../modules/stays/entities/room.entity';
import { Flight } from '../../modules/flights/entities/flight.entity';
import {
  SEED_PASSWORD,
  seedDestinations,
  seedFacilities,
  seedRestaurants,
  seedStays,
  seedTours,
  seedUsers,
} from './data';

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
    } else if (dest.heroImageUrl !== d.heroImageUrl) {
      dest.heroImageUrl = d.heroImageUrl;
      dest = await destRepo.save(dest);
      console.log(`~ destination ${d.name} image backfilled`);
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
          heroImageUrl: t.heroImageUrl,
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
      if (tour.heroImageUrl !== t.heroImageUrl) {
        tour.heroImageUrl = t.heroImageUrl;
        tour = await tourRepo.save(tour);
        console.log(`~ tour ${t.slug} image backfilled`);
      } else {
        console.log(`= tour ${t.slug} already present`);
      }
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

  // Emergency facilities (idempotent by name).
  const facilityRepo = ds.getRepository(MedicalFacility);
  for (const f of seedFacilities) {
    const existing = await facilityRepo.findOne({ where: { name: f.name } });
    if (existing) {
      console.log(`= facility ${f.name} already present`);
      continue;
    }
    await facilityRepo.save(facilityRepo.create(f));
    console.log(`+ facility ${f.name} (${f.type})`);
  }

  // Restaurants (idempotent by slug).
  const restaurantRepo = ds.getRepository(Restaurant);
  for (const r of seedRestaurants) {
    const existing = await restaurantRepo.findOne({ where: { slug: r.slug } });
    if (existing) {
      console.log(`= restaurant ${r.slug} already present`);
      continue;
    }
    await restaurantRepo.save(restaurantRepo.create(r));
    console.log(`+ restaurant ${r.slug} (${r.cuisine})`);
  }

  // Stays + their rooms (idempotent by slug).
  const stayRepo = ds.getRepository(Stay);
  const roomRepo = ds.getRepository(Room);
  for (const s of seedStays) {
    if (await stayRepo.findOne({ where: { slug: s.slug } })) {
      console.log(`= stay ${s.slug} already present`);
      continue;
    }
    const { rooms, ...stayFields } = s;
    const stay = await stayRepo.save(stayRepo.create(stayFields));
    for (const room of rooms) {
      await roomRepo.save(roomRepo.create({ ...room, stayId: stay.id }));
    }
    console.log(`+ stay ${s.slug} (+${rooms.length} rooms)`);
  }

  // Flights — generated across the next few weeks, seeded only when empty
  // (dates are relative to now, so re-seed a fresh DB to refresh availability).
  const flightRepo = ds.getRepository(Flight);
  if ((await flightRepo.count()) === 0) {
    const routes = [
      {
        o: 'ACC',
        d: 'LOS',
        code: 'AW',
        name: 'Africa World Airlines',
        dur: 75,
        price: 85000,
      },
      {
        o: 'LOS',
        d: 'ACC',
        code: 'AW',
        name: 'Africa World Airlines',
        dur: 75,
        price: 85000,
      },
      {
        o: 'ACC',
        d: 'ABJ',
        code: 'KP',
        name: 'ASKY Airlines',
        dur: 90,
        price: 120000,
      },
      {
        o: 'ACC',
        d: 'KMS',
        code: 'AW',
        name: 'Africa World Airlines',
        dur: 50,
        price: 45000,
      },
      {
        o: 'ACC',
        d: 'LHR',
        code: 'BA',
        name: 'British Airways',
        dur: 380,
        price: 950000,
      },
    ];
    const flights: Flight[] = [];
    for (const r of routes) {
      for (let day = 3; day <= 17; day++) {
        for (const hour of [8, 16]) {
          const departsAt = new Date();
          departsAt.setUTCDate(departsAt.getUTCDate() + day);
          departsAt.setUTCHours(hour, 30, 0, 0);
          const arrivesAt = new Date(departsAt.getTime() + r.dur * 60000);
          flights.push(
            flightRepo.create({
              airlineCode: r.code,
              airlineName: r.name,
              origin: r.o,
              destination: r.d,
              departsAt,
              arrivesAt,
              flightNumber: `${r.code}${100 + day}${hour}`,
              durationMinutes: r.dur,
              stops: 0,
              baggageKg: 20,
              refundable: r.price < 900000,
              amenities:
                r.dur > 120 ? ['Meal Included', 'Baggage 20kg'] : ['Snack'],
              priceMinor: r.price,
              currency: 'GHS',
              seatsAvailable: 9,
            }),
          );
        }
      }
    }
    await flightRepo.save(flights);
    console.log(`+ ${flights.length} flights across ${routes.length} routes`);
  } else {
    console.log('= flights already present');
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
