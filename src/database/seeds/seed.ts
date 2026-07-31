import 'reflect-metadata';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { OperatorProfile } from '../../modules/users/entities/operator-profile.entity';
import { Destination } from '../../modules/destinations/entities/destination.entity';
import { Tour } from '../../modules/tours/entities/tour.entity';
import { TourDeparture } from '../../modules/tours/entities/tour-departure.entity';
import {
  TourBooking,
  BookingStatus,
} from '../../modules/bookings/entities/tour-booking.entity';
import { Review } from '../../modules/reviews/entities/review.entity';
import { MedicalFacility } from '../../modules/emergency/entities/medical-facility.entity';
import { EmergencyContact } from '../../modules/emergency/entities/emergency-contact.entity';
import { Restaurant } from '../../modules/food/entities/restaurant.entity';
import { Stay } from '../../modules/stays/entities/stay.entity';
import { Room } from '../../modules/stays/entities/room.entity';
import { Flight } from '../../modules/flights/entities/flight.entity';
import { Driver } from '../../modules/rides/entities/driver.entity';
import {
  Reservation,
  ReservationStatus,
  ReservationType,
} from '../../modules/reservations/entities/reservation.entity';
import {
  Payment,
  PaymentSource,
  PaymentStatus,
} from '../../modules/payments/entities/payment.entity';
import { Itinerary } from '../../modules/itineraries/entities/itinerary.entity';
import {
  SEED_PASSWORD,
  seedDestinations,
  seedDrivers,
  seedEmergencyContacts,
  seedFacilities,
  seedFlightRoutes,
  seedItineraries,
  seedReservations,
  seedRestaurants,
  seedReviewers,
  seedReviews,
  seedStays,
  seedTours,
  seedUsers,
} from './data';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days from now as an absolute date; negative values land in the past. */
const at = (days: number): Date => new Date(Date.now() + days * DAY_MS);

/**
 * Same as `at`, but pinned to 08:00 UTC so the timestamp is identical for every
 * run on a given day. That makes departures matchable by exact value, which is
 * what keeps re-seeding idempotent.
 */
const atMorning = (days: number): Date => {
  const d = at(days);
  d.setUTCHours(8, 0, 0, 0);
  return d;
};

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

  // Reviewer accounts — these carry the completed bookings that reviews hang
  // off, keeping them off the demo tourist's own trip list.
  let newReviewers = 0;
  for (const r of seedReviewers) {
    let user = await userRepo.findOne({ where: { email: r.email } });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          email: r.email,
          passwordHash,
          fullName: r.fullName,
          role: UserRole.TOURIST,
        }),
      );
      newReviewers += 1;
    }
    usersByEmail.set(r.email, user);
  }
  console.log(
    newReviewers > 0
      ? `+ ${newReviewers} reviewer accounts`
      : '= reviewer accounts already present',
  );

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

  // Tours + their departures (idempotent by slug). Each tour gets one past
  // departure and two upcoming, so completed bookings and reviews are coherent.
  const tourRepo = ds.getRepository(Tour);
  const departureRepo = ds.getRepository(TourDeparture);
  const toursBySlug = new Map<string, Tour>();
  const pastDepartureByTourSlug = new Map<string, TourDeparture>();
  const nextDepartureByTourSlug = new Map<string, TourDeparture>();
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
          ratingAvg: t.ratingAvg ?? 0,
          ratingCount: t.ratingCount ?? 0,
        }),
      );
      console.log(`+ tour ${t.slug}`);
    } else if (tour.heroImageUrl !== t.heroImageUrl) {
      tour.heroImageUrl = t.heroImageUrl;
      tour = await tourRepo.save(tour);
      console.log(`~ tour ${t.slug} image backfilled`);
    } else {
      console.log(`= tour ${t.slug} already present`);
    }
    toursBySlug.set(t.slug, tour);

    for (const days of t.departureDaysFromNow) {
      const departsAt = atMorning(days);
      let departure = await departureRepo.findOne({
        where: { tourId: tour.id, departsAt },
      });
      departure ??= await departureRepo.save(
        departureRepo.create({
          tourId: tour.id,
          departsAt,
          capacity: t.capacity,
        }),
      );
      if (days < 0) pastDepartureByTourSlug.set(t.slug, departure);
      else if (!nextDepartureByTourSlug.has(t.slug))
        nextDepartureByTourSlug.set(t.slug, departure);
    }
  }

  // Demo bookings for the tourist across the three tabs. The completed one is
  // pinned to a past departure so it is not a trip that has yet to depart.
  const bookingRepo = ds.getRepository(TourBooking);
  const tourist = usersByEmail.get('kofi@voyago.test')!;
  const demoBookings = [
    {
      slug: 'kakum-canopy-walk',
      ref: 'TUR-2026-9001',
      status: BookingStatus.CONFIRMED,
      past: false,
    },
    {
      slug: 'cape-coast-castle-tour',
      ref: 'TUR-2026-9002',
      status: BookingStatus.COMPLETED,
      past: true,
    },
    {
      slug: 'mole-safari-tour',
      ref: 'TUR-2026-9003',
      status: BookingStatus.CANCELLED,
      past: false,
    },
  ];
  const bookingByRef = new Map<string, TourBooking>();
  for (const b of demoBookings) {
    const existing = await bookingRepo.findOne({ where: { reference: b.ref } });
    if (existing) {
      bookingByRef.set(b.ref, existing);
      console.log(`= booking ${b.ref} already present`);
      continue;
    }
    const tour = toursBySlug.get(b.slug)!;
    const departure = b.past
      ? pastDepartureByTourSlug.get(b.slug)
      : nextDepartureByTourSlug.get(b.slug);
    if (!departure) continue;
    const saved = await bookingRepo.save(
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
    bookingByRef.set(b.ref, saved);
    console.log(`+ booking ${b.ref} (${b.status})`);
  }

  // Reviews. Each needs its own COMPLETED booking on a past departure, because
  // reviews.service.ts enforces one review per completed booking.
  const reviewRepo = ds.getRepository(Review);
  let newReviews = 0;
  const reviewedSlugs = new Set<string>();
  for (const [i, r] of seedReviews.entries()) {
    const tour = toursBySlug.get(r.tourSlug)!;
    const departure = pastDepartureByTourSlug.get(r.tourSlug);
    if (!departure) continue;
    reviewedSlugs.add(r.tourSlug);
    const author = usersByEmail.get(r.reviewer)!;
    const reference = `TUR-SEED-${String(i + 1).padStart(4, '0')}`;

    let booking = await bookingRepo.findOne({ where: { reference } });
    booking ??= await bookingRepo.save(
      bookingRepo.create({
        reference,
        touristId: author.id,
        departureId: departure.id,
        seats: 1,
        unitPriceMinor: tour.priceMinor,
        totalMinor: tour.priceMinor,
        currency: 'GHS',
        status: BookingStatus.COMPLETED,
      }),
    );

    if (await reviewRepo.findOne({ where: { bookingId: booking.id } }))
      continue;
    await reviewRepo.save(
      reviewRepo.create({
        tourId: tour.id,
        bookingId: booking.id,
        authorId: author.id,
        rating: r.rating,
        body: r.body,
      }),
    );
    newReviews += 1;
  }
  console.log(
    newReviews > 0
      ? `+ ${newReviews} reviews across ${reviewedSlugs.size} tours`
      : '= reviews already present',
  );

  // Recompute aggregates on reviewed tours from their own rows, so ratingCount
  // always equals the number of reviews actually stored.
  for (const slug of reviewedSlugs) {
    const tour = toursBySlug.get(slug)!;
    const rows = await reviewRepo.find({ where: { tourId: tour.id } });
    if (rows.length === 0) continue;
    const sum = rows.reduce((acc, row) => acc + row.rating, 0);
    tour.ratingCount = rows.length;
    tour.ratingAvg = Math.round((sum / rows.length) * 100) / 100;
    await tourRepo.save(tour);
  }
  console.log(`~ rating aggregates recomputed for ${reviewedSlugs.size} tours`);

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

  // Emergency contacts for the demo tourist (idempotent by user + phone).
  const contactRepo = ds.getRepository(EmergencyContact);
  for (const c of seedEmergencyContacts) {
    const existing = await contactRepo.findOne({
      where: { userId: tourist.id, phone: c.phone },
    });
    if (existing) {
      console.log(`= emergency contact ${c.name} already present`);
      continue;
    }
    await contactRepo.save(contactRepo.create({ ...c, userId: tourist.id }));
    console.log(`+ emergency contact ${c.name} (${c.relationship})`);
  }

  // Restaurants (idempotent by slug).
  const restaurantRepo = ds.getRepository(Restaurant);
  const restaurantBySlug = new Map<string, Restaurant>();
  for (const r of seedRestaurants) {
    let restaurant = await restaurantRepo.findOne({ where: { slug: r.slug } });
    if (restaurant) {
      console.log(`= restaurant ${r.slug} already present`);
    } else {
      restaurant = await restaurantRepo.save(restaurantRepo.create(r));
      console.log(`+ restaurant ${r.slug} (${r.cuisine})`);
    }
    restaurantBySlug.set(r.slug, restaurant);
  }

  // Stays + their rooms (idempotent by slug).
  const stayRepo = ds.getRepository(Stay);
  const roomRepo = ds.getRepository(Room);
  const stayBySlug = new Map<string, Stay>();
  for (const s of seedStays) {
    let stay = await stayRepo.findOne({ where: { slug: s.slug } });
    if (stay) {
      console.log(`= stay ${s.slug} already present`);
    } else {
      const { rooms, ...stayFields } = s;
      stay = await stayRepo.save(stayRepo.create(stayFields));
      for (const room of rooms) {
        await roomRepo.save(roomRepo.create({ ...room, stayId: stay.id }));
      }
      console.log(`+ stay ${s.slug} (+${rooms.length} rooms)`);
    }
    stayBySlug.set(s.slug, stay);
  }

  // Flights — generated across the next few weeks, seeded only when empty
  // (dates are relative to now, so re-seed a fresh DB to refresh availability).
  const flightRepo = ds.getRepository(Flight);
  if ((await flightRepo.count()) === 0) {
    const flights: Flight[] = [];
    for (const r of seedFlightRoutes) {
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
    console.log(
      `+ ${flights.length} flights across ${seedFlightRoutes.length} routes`,
    );
  } else {
    console.log('= flights already present');
  }

  // Drivers around Accra (idempotent by plate).
  const driverRepo = ds.getRepository(Driver);
  for (const d of seedDrivers) {
    if (await driverRepo.findOne({ where: { vehiclePlate: d.vehiclePlate } })) {
      console.log(`= driver ${d.vehiclePlate} already present`);
      continue;
    }
    await driverRepo.save(driverRepo.create(d));
    console.log(`+ driver ${d.name} (${d.vehicleType})`);
  }

  // Reservations for the demo tourist (idempotent by reference). The item
  // snapshot is resolved from the seeded stay, restaurant or flight it points at.
  const reservationRepo = ds.getRepository(Reservation);
  const reservationByRef = new Map<string, Reservation>();
  for (const r of seedReservations) {
    const existing = await reservationRepo.findOne({
      where: { reference: r.reference },
    });
    if (existing) {
      reservationByRef.set(r.reference, existing);
      console.log(`= reservation ${r.reference} already present`);
      continue;
    }

    let itemId: string | undefined;
    let slug: string | undefined;
    let imageUrl: string | undefined;
    if (r.type === ReservationType.STAY) {
      const stay = stayBySlug.get(r.lookup);
      itemId = stay?.id;
      slug = stay?.slug;
      imageUrl = stay?.heroImageUrl;
    } else if (r.type === ReservationType.TABLE) {
      const restaurant = restaurantBySlug.get(r.lookup);
      itemId = restaurant?.id;
      slug = restaurant?.slug;
      imageUrl = restaurant?.heroImageUrl;
    } else {
      const [origin, destination] = r.lookup.split('-');
      const flight = await flightRepo.findOne({
        where: { origin, destination },
      });
      itemId = flight?.id;
      slug = flight?.flightNumber;
    }
    if (!itemId) {
      console.log(`! reservation ${r.reference} skipped — ${r.lookup} missing`);
      continue;
    }

    const saved = await reservationRepo.save(
      reservationRepo.create({
        reference: r.reference,
        userId: tourist.id,
        type: r.type,
        status: r.status,
        totalMinor: r.totalMinor,
        currency: 'GHS',
        item: {
          id: itemId,
          slug,
          title: r.title,
          subtitle: r.subtitle,
          imageUrl,
          startsAt: at(r.startsAtDaysFromNow).toISOString(),
          endsAt: at(r.endsAtDaysFromNow).toISOString(),
        },
        cancelledAt:
          r.status === ReservationStatus.CANCELLED ? new Date() : undefined,
      }),
    );
    reservationByRef.set(r.reference, saved);
    console.log(`+ reservation ${r.reference} (${r.type}/${r.status})`);
  }

  // Payments settling the demo bookings and reservations (idempotent by ref).
  const paymentRepo = ds.getRepository(Payment);
  const demoPayments = [
    {
      ref: 'ps_seed_tur_9001',
      bookingId: bookingByRef.get('TUR-2026-9001')?.id,
      source: PaymentSource.TOUR,
      amountMinor: bookingByRef.get('TUR-2026-9001')?.totalMinor,
      status: PaymentStatus.PAID,
    },
    {
      ref: 'ps_seed_tur_9002',
      bookingId: bookingByRef.get('TUR-2026-9002')?.id,
      source: PaymentSource.TOUR,
      amountMinor: bookingByRef.get('TUR-2026-9002')?.totalMinor,
      status: PaymentStatus.PAID,
    },
    {
      ref: 'ps_seed_tur_9003',
      bookingId: bookingByRef.get('TUR-2026-9003')?.id,
      source: PaymentSource.TOUR,
      amountMinor: bookingByRef.get('TUR-2026-9003')?.totalMinor,
      status: PaymentStatus.REFUNDED,
    },
    {
      ref: 'ps_seed_rsv_4101',
      bookingId: reservationByRef.get('RSV-2026-4101')?.id,
      source: PaymentSource.RESERVATION,
      amountMinor: reservationByRef.get('RSV-2026-4101')?.totalMinor,
      status: PaymentStatus.PAID,
    },
    {
      ref: 'ps_seed_rsv_4102',
      bookingId: reservationByRef.get('RSV-2026-4102')?.id,
      source: PaymentSource.RESERVATION,
      amountMinor: reservationByRef.get('RSV-2026-4102')?.totalMinor,
      status: PaymentStatus.PAID,
    },
    {
      ref: 'ps_seed_rsv_4103',
      bookingId: reservationByRef.get('RSV-2026-4103')?.id,
      source: PaymentSource.RESERVATION,
      amountMinor: reservationByRef.get('RSV-2026-4103')?.totalMinor,
      status: PaymentStatus.PAID,
    },
    {
      ref: 'ps_seed_rsv_4104',
      bookingId: reservationByRef.get('RSV-2026-4104')?.id,
      source: PaymentSource.RESERVATION,
      amountMinor: reservationByRef.get('RSV-2026-4104')?.totalMinor,
      status: PaymentStatus.PAID,
    },
    {
      ref: 'ps_seed_rsv_4106',
      bookingId: reservationByRef.get('RSV-2026-4106')?.id,
      source: PaymentSource.RESERVATION,
      amountMinor: reservationByRef.get('RSV-2026-4106')?.totalMinor,
      status: PaymentStatus.FAILED,
    },
  ];
  for (const p of demoPayments) {
    if (!p.bookingId || p.amountMinor === undefined) continue;
    if (await paymentRepo.findOne({ where: { providerRef: p.ref } })) {
      console.log(`= payment ${p.ref} already present`);
      continue;
    }
    await paymentRepo.save(
      paymentRepo.create({
        bookingId: p.bookingId,
        source: p.source,
        providerRef: p.ref,
        amountMinor: p.amountMinor,
        currency: 'GHS',
        status: p.status,
      }),
    );
    console.log(`+ payment ${p.ref} (${p.status})`);
  }

  // Saved itineraries for the demo tourist (idempotent by user + title).
  const itineraryRepo = ds.getRepository(Itinerary);
  for (const it of seedItineraries) {
    const existing = await itineraryRepo.findOne({
      where: { userId: tourist.id, title: it.title },
    });
    if (existing) {
      console.log(`= itinerary "${it.title}" already present`);
      continue;
    }
    await itineraryRepo.save(
      itineraryRepo.create({
        userId: tourist.id,
        title: it.title,
        destinationName: it.destinationName,
        days: it.days,
        budgetMinor: it.budgetMinor,
        partySize: it.partySize,
        interests: it.interests,
        plan: it.plan,
        // Hand-written, not model-generated — do not attribute to a real model.
        model: 'seed',
      }),
    );
    console.log(`+ itinerary "${it.title}"`);
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
