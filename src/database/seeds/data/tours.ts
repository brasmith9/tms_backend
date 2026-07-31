import { TourStatus } from '../../../modules/tours/entities/tour.entity';
import { IMG, PHOTO } from './shared';

export interface SeedTour {
  slug: string;
  title: string;
  /** Matches a name in seedDestinations. */
  destination: string;
  /** Matches an email in seedUsers. */
  operator: string;
  description: string;
  priceMinor: number;
  durationMinutes: number;
  status: TourStatus;
  /** One past date and two upcoming, relative to seed time. */
  departureDaysFromNow: number[];
  capacity: number;
  heroImageUrl: string;
  /**
   * Omitted on the eight tours listed in seedReviews — their aggregates are
   * computed from real review rows so counts and rows reconcile.
   */
  ratingAvg?: number;
  ratingCount?: number;
}

const OP1 = 'operator1@voyago.test';
const OP2 = 'operator2@voyago.test';

export const seedTours: SeedTour[] = [
  // ---- Cape Coast ----
  {
    slug: 'kakum-canopy-walk',
    title: 'Kakum Canopy Walk',
    destination: 'Cape Coast',
    operator: OP1,
    description: 'A guided walk across the Kakum forest canopy walkway.',
    priceMinor: 12000,
    durationMinutes: 180,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-42, 30, 58],
    capacity: 20,
    heroImageUrl: IMG(PHOTO.forest),
  },
  {
    slug: 'cape-coast-castle-tour',
    title: 'Cape Coast Castle Heritage Tour',
    destination: 'Cape Coast',
    operator: OP1,
    description: 'A moving guided tour through Cape Coast Castle’s history.',
    priceMinor: 8000,
    durationMinutes: 120,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-21, 14, 40],
    capacity: 25,
    heroImageUrl: IMG(PHOTO.castle),
  },
  {
    slug: 'assin-manso-slave-river',
    title: 'Assin Manso Slave River Memorial',
    destination: 'Cape Coast',
    operator: OP2,
    description:
      'Visit the Ancestral Slave River and memorial gardens at Assin Manso.',
    priceMinor: 9500,
    durationMinutes: 240,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-35, 18, 46],
    capacity: 18,
    heroImageUrl: IMG(PHOTO.forest),
    ratingAvg: 4.6,
    ratingCount: 22,
  },

  // ---- Accra ----
  {
    slug: 'accra-city-heritage-tour',
    title: 'Accra City Heritage Tour',
    destination: 'Accra',
    operator: OP1,
    description:
      'Independence Square, Kwame Nkrumah Mausoleum and the National Museum.',
    priceMinor: 15000,
    durationMinutes: 300,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-28, 12, 33],
    capacity: 22,
    heroImageUrl: IMG(PHOTO.city),
  },
  {
    slug: 'jamestown-street-food-walk',
    title: 'Jamestown Street Food Walk',
    destination: 'Accra',
    operator: OP2,
    description:
      'Eat through old Accra — kelewele, waakye and kenkey with a local guide.',
    priceMinor: 11000,
    durationMinutes: 180,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-14, 9, 27],
    capacity: 12,
    heroImageUrl: IMG(PHOTO.localFood),
    ratingAvg: 4.8,
    ratingCount: 37,
  },
  {
    slug: 'accra-art-and-markets',
    title: 'Accra Art & Markets Day',
    destination: 'Accra',
    operator: OP2,
    description:
      'Artists Alliance Gallery, Makola Market and the Arts Centre craft stalls.',
    priceMinor: 10000,
    durationMinutes: 240,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-19, 16, 44],
    capacity: 16,
    heroImageUrl: IMG(PHOTO.market),
    ratingAvg: 4.2,
    ratingCount: 14,
  },

  // ---- Kumasi ----
  {
    slug: 'manhyia-palace-tour',
    title: 'Manhyia Palace Museum Tour',
    destination: 'Kumasi',
    operator: OP2,
    description:
      'The seat of the Asantehene, with regalia and Ashanti royal history.',
    priceMinor: 9000,
    durationMinutes: 150,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-31, 15, 41],
    capacity: 20,
    heroImageUrl: IMG(PHOTO.castle),
  },
  {
    slug: 'kejetia-market-walk',
    title: 'Kejetia Market Walk',
    destination: 'Kumasi',
    operator: OP2,
    description:
      'Navigate West Africa’s largest open-air market with a local trader.',
    priceMinor: 7000,
    durationMinutes: 150,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-11, 20, 48],
    capacity: 14,
    heroImageUrl: IMG(PHOTO.market),
    ratingAvg: 4.4,
    ratingCount: 29,
  },
  {
    slug: 'bonwire-kente-workshop',
    title: 'Bonwire Kente Weaving Workshop',
    destination: 'Kumasi',
    operator: OP2,
    description:
      'Learn to weave at the Ashanti kente village and take home your strip.',
    priceMinor: 13500,
    durationMinutes: 210,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-24, 22, 52],
    capacity: 10,
    heroImageUrl: IMG(PHOTO.market),
    ratingAvg: 4.9,
    ratingCount: 18,
  },

  // ---- Mole National Park ----
  {
    slug: 'mole-safari-tour',
    title: 'Mole Safari Tour',
    destination: 'Mole National Park',
    operator: OP2,
    description: 'A dawn safari tracking elephants and antelope at Mole.',
    priceMinor: 28000,
    durationMinutes: 300,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-38, 45, 72],
    capacity: 12,
    heroImageUrl: IMG(PHOTO.savannah),
  },
  {
    slug: 'mole-walking-safari',
    title: 'Mole Guided Walking Safari',
    destination: 'Mole National Park',
    operator: OP1,
    description:
      'On-foot savannah walk with an armed ranger, ending at the waterhole.',
    priceMinor: 22000,
    durationMinutes: 240,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-16, 37, 65],
    capacity: 8,
    heroImageUrl: IMG(PHOTO.savannah),
    ratingAvg: 4.7,
    ratingCount: 26,
  },

  // ---- Elmina ----
  {
    slug: 'elmina-castle-tour',
    title: 'Elmina Castle Guided Tour',
    destination: 'Elmina',
    operator: OP1,
    description:
      'The oldest European building in sub-Saharan Africa, told by a local guide.',
    priceMinor: 8500,
    durationMinutes: 120,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-26, 11, 36],
    capacity: 25,
    heroImageUrl: IMG(PHOTO.castle),
  },
  {
    slug: 'elmina-fishing-harbour-tour',
    title: 'Elmina Fishing Harbour Morning',
    destination: 'Elmina',
    operator: OP1,
    description:
      'Dawn at the harbour as the canoe fleet lands and the fish market opens.',
    priceMinor: 6500,
    durationMinutes: 120,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-9, 13, 31],
    capacity: 15,
    heroImageUrl: IMG(PHOTO.coast),
    ratingAvg: 4.3,
    ratingCount: 11,
  },
  {
    slug: 'elmina-posuban-shrines',
    title: 'Elmina Posuban Shrines Walk',
    destination: 'Elmina',
    operator: OP2,
    description:
      'The painted asafo company shrines scattered through Elmina town.',
    priceMinor: 7500,
    durationMinutes: 150,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-33, 25, 54],
    capacity: 14,
    heroImageUrl: IMG(PHOTO.coast),
    ratingAvg: 4.1,
    ratingCount: 8,
  },

  // ---- Ho ----
  {
    slug: 'mount-adaklu-hike',
    title: 'Mount Adaklu Hike',
    destination: 'Ho',
    operator: OP1,
    description: 'A steep half-day climb with views across the Volta plains.',
    priceMinor: 9000,
    durationMinutes: 300,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-22, 19, 47],
    capacity: 12,
    heroImageUrl: IMG(PHOTO.forest),
    ratingAvg: 4.5,
    ratingCount: 16,
  },
  {
    slug: 'tafi-atome-monkey-sanctuary',
    title: 'Tafi Atome Monkey Sanctuary',
    destination: 'Ho',
    operator: OP1,
    description:
      'Hand-feed the sacred mona monkeys in this community-run sanctuary.',
    priceMinor: 8000,
    durationMinutes: 180,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-13, 24, 51],
    capacity: 16,
    heroImageUrl: IMG(PHOTO.forest),
    ratingAvg: 4.6,
    ratingCount: 31,
  },

  // ---- Busua ----
  {
    slug: 'busua-surf-lesson',
    title: 'Busua Beginner Surf Lesson',
    destination: 'Busua',
    operator: OP1,
    description: 'Two-hour lesson with board and rash vest on Busua’s break.',
    priceMinor: 15000,
    durationMinutes: 120,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-17, 8, 29],
    capacity: 8,
    heroImageUrl: IMG(PHOTO.beach),
    ratingAvg: 4.8,
    ratingCount: 24,
  },
  {
    slug: 'cape-three-points-hike',
    title: 'Cape Three Points Lighthouse Hike',
    destination: 'Busua',
    operator: OP2,
    description:
      'Walk to the southernmost point of Ghana and its colonial lighthouse.',
    priceMinor: 11000,
    durationMinutes: 270,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-29, 21, 49],
    capacity: 12,
    heroImageUrl: IMG(PHOTO.coast),
    ratingAvg: 4.4,
    ratingCount: 13,
  },
  {
    slug: 'busua-village-cook-along',
    title: 'Busua Village Cook-Along',
    destination: 'Busua',
    operator: OP2,
    description:
      'Shop the village market, then cook groundnut soup and fufu with a host.',
    priceMinor: 12500,
    durationMinutes: 210,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-8, 17, 38],
    capacity: 10,
    heroImageUrl: IMG(PHOTO.localFood),
    ratingAvg: 4.7,
    ratingCount: 19,
  },

  // ---- Wli Falls ----
  {
    slug: 'wli-waterfalls-hike',
    title: 'Wli Lower Falls Guided Hike',
    destination: 'Wli Falls',
    operator: OP1,
    description:
      'Forty-minute forest walk to the base of West Africa’s tallest waterfall.',
    priceMinor: 7000,
    durationMinutes: 180,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-25, 10, 34],
    capacity: 20,
    heroImageUrl: IMG(PHOTO.forest),
  },
  {
    slug: 'wli-upper-falls-trek',
    title: 'Wli Upper Falls Full-Day Trek',
    destination: 'Wli Falls',
    operator: OP1,
    description:
      'A demanding climb over the Agumatsa ridge to the rarely visited upper falls.',
    priceMinor: 18000,
    durationMinutes: 420,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-20, 26, 55],
    capacity: 8,
    heroImageUrl: IMG(PHOTO.forest),
    ratingAvg: 4.9,
    ratingCount: 12,
  },

  // ---- Ada Foah ----
  {
    slug: 'ada-estuary-boat-cruise',
    title: 'Ada Volta Estuary Boat Cruise',
    destination: 'Ada Foah',
    operator: OP2,
    description:
      'Sunset cruise to the sandbar where the Volta meets the Atlantic.',
    priceMinor: 16000,
    durationMinutes: 180,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-12, 7, 28],
    capacity: 18,
    heroImageUrl: IMG(PHOTO.coast),
    ratingAvg: 4.6,
    ratingCount: 34,
  },
  {
    slug: 'ada-kite-surfing-intro',
    title: 'Ada Kite Surfing Intro',
    destination: 'Ada Foah',
    operator: OP2,
    description: 'Half-day intro on the estuary flats with certified coaches.',
    priceMinor: 32000,
    durationMinutes: 240,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-15, 23, 50],
    capacity: 6,
    heroImageUrl: IMG(PHOTO.beach),
    ratingAvg: 4.7,
    ratingCount: 9,
  },
  {
    slug: 'songor-lagoon-salt-tour',
    title: 'Songor Lagoon Salt Harvest Tour',
    destination: 'Ada Foah',
    operator: OP1,
    description:
      'Walk the salt pans with the women’s cooperative that works them.',
    priceMinor: 8500,
    durationMinutes: 180,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-27, 29, 57],
    capacity: 14,
    heroImageUrl: IMG(PHOTO.coast),
    ratingAvg: 4.2,
    ratingCount: 7,
  },

  // ---- Tamale ----
  {
    slug: 'tamale-cultural-tour',
    title: 'Tamale Cultural Half-Day',
    destination: 'Tamale',
    operator: OP2,
    description:
      'Central market, the chief’s palace and a smock-weaving workshop.',
    priceMinor: 10500,
    durationMinutes: 240,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-23, 27, 56],
    capacity: 16,
    heroImageUrl: IMG(PHOTO.market),
    ratingAvg: 4.3,
    ratingCount: 15,
  },
  {
    slug: 'larabanga-mosque-visit',
    title: 'Larabanga Ancient Mosque Visit',
    destination: 'Tamale',
    operator: OP2,
    description:
      'Ghana’s oldest mosque, in Sudanese mud-and-stick style, near Mole.',
    priceMinor: 9500,
    durationMinutes: 300,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-18, 32, 61],
    capacity: 14,
    heroImageUrl: IMG(PHOTO.savannah),
    ratingAvg: 4.5,
    ratingCount: 21,
  },

  // ---- Axim ----
  {
    slug: 'axim-fort-san-antonio',
    title: 'Fort San Antonio Tour, Axim',
    destination: 'Axim',
    operator: OP1,
    description:
      'The 1515 Portuguese fort above Axim bay, still largely intact.',
    priceMinor: 7500,
    durationMinutes: 120,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-30, 20, 45],
    capacity: 18,
    heroImageUrl: IMG(PHOTO.castle),
    ratingAvg: 4.4,
    ratingCount: 10,
  },
  {
    slug: 'axim-beach-and-lagoon-day',
    title: 'Axim Beach & Lagoon Day',
    destination: 'Axim',
    operator: OP1,
    description:
      'Palm-backed beach, lagoon paddle and a grilled seafood lunch.',
    priceMinor: 14000,
    durationMinutes: 300,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-10, 14, 39],
    capacity: 12,
    heroImageUrl: IMG(PHOTO.beach),
    ratingAvg: 4.5,
    ratingCount: 17,
  },

  // ---- Nzulezo ----
  {
    slug: 'nzulezo-stilt-village-tour',
    title: 'Nzulezo Stilt Village Canoe Tour',
    destination: 'Nzulezo',
    operator: OP2,
    description:
      'An hour by dugout canoe through the Amansuri wetland to the stilt village.',
    priceMinor: 13000,
    durationMinutes: 300,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-34, 18, 43],
    capacity: 12,
    heroImageUrl: IMG(PHOTO.forest),
  },
  {
    slug: 'amansuri-wetland-birding',
    title: 'Amansuri Wetland Birding Morning',
    destination: 'Nzulezo',
    operator: OP2,
    description:
      'Dawn paddle through Ghana’s largest intact swamp forest with a birder.',
    priceMinor: 15500,
    durationMinutes: 240,
    status: TourStatus.APPROVED,
    departureDaysFromNow: [-7, 31, 60],
    capacity: 8,
    heroImageUrl: IMG(PHOTO.forest),
    ratingAvg: 4.8,
    ratingCount: 6,
  },
];
