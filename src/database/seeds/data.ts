import { UserRole } from '../../modules/users/entities/user.entity';
import { TourStatus } from '../../modules/tours/entities/tour.entity';
import { FacilityType } from '../../modules/emergency/entities/medical-facility.entity';

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
