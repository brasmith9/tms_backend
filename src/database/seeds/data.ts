import { UserRole } from '../../modules/users/entities/user.entity';
import { TourStatus } from '../../modules/tours/entities/tour.entity';
import { FacilityType } from '../../modules/emergency/entities/medical-facility.entity';
import { StayCategory } from '../../modules/stays/entities/stay.entity';

/** All seed accounts share this password. */
export const SEED_PASSWORD = 'password123';

export const seedUsers = [
  { email: 'admin@voyago.test', fullName: 'Ama Owusu', role: UserRole.ADMIN },
  {
    email: 'operator1@voyago.test',
    fullName: 'Kwame Mensah',
    role: UserRole.OPERATOR,
    company: 'Gold Coast Expeditions',
  },
  {
    email: 'operator2@voyago.test',
    fullName: 'Yaa Asantewaa',
    role: UserRole.OPERATOR,
    company: 'Ashanti Heritage Tours',
  },
  {
    email: 'kofi@voyago.test',
    fullName: 'Kofi Mensah',
    role: UserRole.TOURIST,
  },
];

/** Shared Unsplash sizing so every seeded image loads at a sensible resolution. */
const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

export const seedDestinations = [
  {
    name: 'Cape Coast',
    region: 'Central Region',
    description: 'Historic coastal town home to Cape Coast Castle.',
    lat: 5.106,
    lng: -1.246,
    heroImageUrl: IMG('1590523277543-a94d2e4eb00b'),
  },
  {
    name: 'Accra',
    region: 'Greater Accra',
    description: 'Ghana’s vibrant capital on the Atlantic coast.',
    lat: 5.6037,
    lng: -0.187,
    heroImageUrl: IMG('1580060839134-75a5edca2e99'),
  },
  {
    name: 'Kumasi',
    region: 'Ashanti Region',
    description: 'The cultural heart of the Ashanti Kingdom.',
    lat: 6.6885,
    lng: -1.6244,
    heroImageUrl: IMG('1518495973542-4542c06a5843'),
  },
  {
    name: 'Mole National Park',
    region: 'Savannah Region',
    description: 'Ghana’s largest wildlife refuge, home to elephants.',
    lat: 9.26,
    lng: -1.85,
    heroImageUrl: IMG('1516426122078-c23e76319801'),
  },
  {
    name: 'Elmina',
    region: 'Central Region',
    description: 'Fishing town famed for Elmina Castle.',
    lat: 5.0847,
    lng: -1.3506,
    heroImageUrl: IMG('1507525428034-b723cf961d3e'),
  },
];

/** Tours are keyed to a destination name and an operator email. */
export const seedTours = [
  {
    slug: 'kakum-canopy-walk',
    title: 'Kakum Canopy Walk',
    destination: 'Cape Coast',
    operator: 'operator1@voyago.test',
    description: 'A guided walk across the Kakum forest canopy walkway.',
    priceMinor: 12000,
    durationMinutes: 180,
    status: TourStatus.APPROVED,
    departureDaysFromNow: 30,
    capacity: 20,
    heroImageUrl: IMG('1441974231531-c6227db76b6e'),
  },
  {
    slug: 'mole-safari-tour',
    title: 'Mole Safari Tour',
    destination: 'Mole National Park',
    operator: 'operator2@voyago.test',
    description: 'A dawn safari tracking elephants and antelope at Mole.',
    priceMinor: 28000,
    durationMinutes: 300,
    status: TourStatus.APPROVED,
    departureDaysFromNow: 45,
    capacity: 12,
    heroImageUrl: IMG('1516426122078-c23e76319801'),
  },
  {
    slug: 'cape-coast-castle-tour',
    title: 'Cape Coast Castle Heritage Tour',
    destination: 'Cape Coast',
    operator: 'operator1@voyago.test',
    description: 'A moving guided tour through Cape Coast Castle’s history.',
    priceMinor: 8000,
    durationMinutes: 120,
    status: TourStatus.APPROVED,
    departureDaysFromNow: 14,
    capacity: 25,
    heroImageUrl: IMG('1564507592333-c60657eea523'),
  },
];

/** Real Ghanaian emergency facilities for the M6 nearest-facility lookup. */
export const seedFacilities = [
  {
    name: 'Korle Bu Teaching Hospital',
    type: FacilityType.HOSPITAL,
    description: 'Ghana’s largest tertiary hospital, with 24/7 emergency care.',
    lat: 5.5364,
    lng: -0.226,
    phone: '+233302674067',
    open24h: true,
  },
  {
    name: '37 Military Hospital',
    type: FacilityType.HOSPITAL,
    description: 'Major Accra hospital with a 24-hour trauma centre.',
    lat: 5.585,
    lng: -0.183,
    phone: '+233302776111',
    open24h: true,
  },
  {
    name: 'Greater Accra Regional Hospital (Ridge)',
    type: FacilityType.HOSPITAL,
    description: 'Central Accra regional hospital and emergency unit.',
    lat: 5.56,
    lng: -0.201,
    phone: '+233302228382',
    open24h: true,
  },
  {
    name: 'Cape Coast Teaching Hospital',
    type: FacilityType.HOSPITAL,
    description: 'Tertiary hospital serving the Central Region.',
    lat: 5.115,
    lng: -1.29,
    phone: '+233332132400',
    open24h: true,
  },
  {
    name: 'Komfo Anokye Teaching Hospital',
    type: FacilityType.HOSPITAL,
    description: 'Kumasi’s main tertiary hospital and trauma centre.',
    lat: 6.697,
    lng: -1.63,
    phone: '+233322022308',
    open24h: true,
  },
  {
    name: 'Ghana Police Service HQ',
    type: FacilityType.POLICE,
    description: 'National police headquarters, Accra.',
    lat: 5.55,
    lng: -0.205,
    phone: '191',
    open24h: true,
  },
  {
    name: 'Ghana National Fire Service HQ',
    type: FacilityType.FIRE,
    description: 'National fire service headquarters, Accra.',
    lat: 5.558,
    lng: -0.196,
    phone: '192',
    open24h: true,
  },
  {
    name: 'U.S. Embassy Accra',
    type: FacilityType.EMBASSY,
    description: 'Consular assistance for U.S. citizens in Ghana.',
    lat: 5.63,
    lng: -0.172,
    phone: '+233302741000',
    open24h: false,
  },
];

/** Open every day 11:00–22:00 UTC. */
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  opens: '11:00',
  closes: '22:00',
}));

export const seedRestaurants = [
  {
    slug: 'buka-restaurant-osu',
    name: 'Buka Restaurant',
    cuisine: 'Ghanaian',
    priceTier: 2,
    description: 'Beloved Osu spot for jollof, banku and grilled tilapia.',
    lat: 5.5571,
    lng: -0.182,
    heroImageUrl: IMG('1517248135467-4c7edcad34c4'),
    images: [IMG('1517248135467-4c7edcad34c4')],
    dietary: ['HALAL'],
    openingHours: ALL_WEEK,
    menu: [
      {
        category: 'Mains',
        items: [
          { name: 'Jollof with grilled chicken', priceMinor: 7500 },
          { name: 'Banku with tilapia', priceMinor: 9000 },
          { name: 'Waakye special', priceMinor: 6000 },
        ],
      },
      {
        category: 'Drinks',
        items: [
          { name: 'Sobolo (hibiscus)', priceMinor: 1500 },
          { name: 'Fresh coconut', priceMinor: 1200 },
        ],
      },
    ],
    ratingAvg: 4.6,
    ratingCount: 128,
  },
  {
    slug: 'santoku-accra',
    name: 'Santoku',
    cuisine: 'Japanese',
    priceTier: 4,
    description: 'Upscale Japanese dining at Villaggio, Airport Residential.',
    lat: 5.6182,
    lng: -0.174,
    heroImageUrl: IMG('1414235077428-338989a2e8c0'),
    images: [IMG('1414235077428-338989a2e8c0')],
    dietary: ['VEGETARIAN', 'GLUTEN_FREE'],
    openingHours: ALL_WEEK,
    menu: [
      {
        category: 'Sushi',
        items: [
          { name: 'Salmon nigiri (2 pcs)', priceMinor: 9000 },
          { name: 'Dragon roll', priceMinor: 16000 },
        ],
      },
    ],
    ratingAvg: 4.8,
    ratingCount: 76,
  },
  {
    slug: 'zen-garden-accra',
    name: 'Zen Garden',
    cuisine: 'Asian Fusion',
    priceTier: 3,
    description: 'Garden setting with pan-Asian and vegetarian plates.',
    lat: 5.6205,
    lng: -0.1712,
    heroImageUrl: IMG('1552566626-52f8b828add9'),
    images: [IMG('1552566626-52f8b828add9')],
    dietary: ['VEGETARIAN', 'VEGAN'],
    openingHours: ALL_WEEK,
    menu: [
      {
        category: 'Plates',
        items: [
          { name: 'Pad thai (veg)', priceMinor: 8500 },
          { name: 'Tofu curry', priceMinor: 8000 },
        ],
      },
    ],
    ratingAvg: 4.5,
    ratingCount: 54,
  },
  {
    slug: 'coco-lounge-cape-coast',
    name: 'Coco Lounge',
    cuisine: 'Continental',
    priceTier: 3,
    description: 'Seafront continental dining near Cape Coast Castle.',
    lat: 5.104,
    lng: -1.248,
    heroImageUrl: IMG('1555396273-367ea4eb4db5'),
    images: [IMG('1555396273-367ea4eb4db5')],
    dietary: ['GLUTEN_FREE'],
    openingHours: ALL_WEEK,
    menu: [
      {
        category: 'Mains',
        items: [
          { name: 'Grilled lobster', priceMinor: 22000 },
          { name: 'Beef burger & fries', priceMinor: 9500 },
        ],
      },
    ],
    ratingAvg: 4.3,
    ratingCount: 41,
  },
];

/** Stays with their rooms (prices in pesewas). */
export const seedStays = [
  {
    slug: 'labadi-beach-hotel',
    name: 'Labadi Beach Hotel',
    category: StayCategory.HOTEL,
    location: 'Labadi, Accra',
    lat: 5.5602,
    lng: -0.1477,
    stars: 5,
    ratingAvg: 4.7,
    ratingCount: 210,
    fromPriceMinor: 120000,
    amenities: ['WIFI', 'POOL', 'BREAKFAST', 'PARKING', 'GYM'],
    heroImageUrl: IMG('1566073771259-6a8506099945'),
    images: [IMG('1566073771259-6a8506099945')],
    description: 'Five-star beachfront hotel on the Labadi shore in Accra.',
    rooms: [
      {
        name: 'Deluxe Room',
        maxGuests: 2,
        bed: 'King',
        pricePerNightMinor: 120000,
      },
      {
        name: 'Ocean Suite',
        maxGuests: 4,
        bed: '2 Queen',
        pricePerNightMinor: 240000,
      },
    ],
  },
  {
    slug: 'kempinski-gold-coast-accra',
    name: 'Kempinski Hotel Gold Coast City',
    category: StayCategory.HOTEL,
    location: 'Ridge, Accra',
    lat: 5.5606,
    lng: -0.1969,
    stars: 5,
    ratingAvg: 4.8,
    ratingCount: 342,
    fromPriceMinor: 180000,
    amenities: ['WIFI', 'POOL', 'BREAKFAST', 'PARKING', 'SPA', 'GYM'],
    heroImageUrl: IMG('1571896349842-33c89424de2d'),
    images: [IMG('1571896349842-33c89424de2d')],
    description: 'Luxury city hotel with spa and pool in central Accra.',
    rooms: [
      {
        name: 'Superior Room',
        maxGuests: 2,
        bed: 'King',
        pricePerNightMinor: 180000,
      },
      {
        name: 'Executive Suite',
        maxGuests: 3,
        bed: 'King',
        pricePerNightMinor: 320000,
      },
    ],
  },
  {
    slug: 'coconut-grove-cape-coast',
    name: 'Coconut Grove Beach Resort',
    category: StayCategory.VILLA,
    location: 'Elmina, Central Region',
    lat: 5.0847,
    lng: -1.3506,
    stars: 4,
    ratingAvg: 4.4,
    ratingCount: 98,
    fromPriceMinor: 65000,
    amenities: ['WIFI', 'POOL', 'BREAKFAST', 'PARKING'],
    heroImageUrl: IMG('1582719478250-c89cae4dc85b'),
    images: [IMG('1582719478250-c89cae4dc85b')],
    description: 'Beachfront resort villas near Elmina and Cape Coast castles.',
    rooms: [
      {
        name: 'Garden Chalet',
        maxGuests: 2,
        bed: 'Queen',
        pricePerNightMinor: 65000,
      },
      {
        name: 'Beach Villa',
        maxGuests: 6,
        bed: '3 Queen',
        pricePerNightMinor: 150000,
      },
    ],
  },
];
