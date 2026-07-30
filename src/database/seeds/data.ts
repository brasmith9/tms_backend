import { UserRole } from '../../modules/users/entities/user.entity';
import { TourStatus } from '../../modules/tours/entities/tour.entity';

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

export const seedDestinations = [
  {
    name: 'Cape Coast',
    region: 'Central Region',
    description: 'Historic coastal town home to Cape Coast Castle.',
    lat: 5.106,
    lng: -1.246,
  },
  {
    name: 'Accra',
    region: 'Greater Accra',
    description: 'Ghana’s vibrant capital on the Atlantic coast.',
    lat: 5.6037,
    lng: -0.187,
  },
  {
    name: 'Kumasi',
    region: 'Ashanti Region',
    description: 'The cultural heart of the Ashanti Kingdom.',
    lat: 6.6885,
    lng: -1.6244,
  },
  {
    name: 'Mole National Park',
    region: 'Savannah Region',
    description: 'Ghana’s largest wildlife refuge, home to elephants.',
    lat: 9.26,
    lng: -1.85,
  },
  {
    name: 'Elmina',
    region: 'Central Region',
    description: 'Fishing town famed for Elmina Castle.',
    lat: 5.0847,
    lng: -1.3506,
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
  },
];
