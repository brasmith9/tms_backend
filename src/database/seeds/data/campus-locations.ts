import { LocationCategory } from '../../../modules/locations/entities/location.entity';
import { IMG, PHOTO } from './shared';

/**
 * Real University of Ghana, Legon landmarks. Coordinates are approximate campus
 * positions (to ~4 decimal places / ~10m) taken from the campus layout, not a
 * survey — good enough for "what is near me" ordering, not for turn-by-turn.
 */
export const seedCampusLocations = [
  {
    slug: 'balme-library',
    name: 'Balme Library',
    category: LocationCategory.ADMINISTRATION,
    description:
      'The main university library, at the head of the central campus avenue.',
    lat: 5.6508,
    lng: -0.1869,
    photos: [IMG(PHOTO.city)],
    buildingNotes:
      'Faces the Great Hall down the main avenue; reading rooms on the upper floors.',
  },
  {
    slug: 'great-hall',
    name: 'Great Hall',
    category: LocationCategory.ADMINISTRATION,
    description:
      'Ceremonial hall used for congregation, matriculation and major events.',
    lat: 5.6538,
    lng: -0.1865,
    photos: [IMG(PHOTO.castle)],
    buildingNotes: 'Top of the avenue, above the Balme Library lawn.',
  },
  {
    slug: 'commonwealth-hall',
    name: 'Commonwealth Hall',
    category: LocationCategory.HOSTEL_HALL,
    description:
      'The all-male traditional hall of residence, known on campus as Vandal City.',
    lat: 5.654,
    lng: -0.1855,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'On the ridge north-east of the Great Hall.',
  },
  {
    slug: 'legon-hall',
    name: 'Legon Hall',
    category: LocationCategory.HOSTEL_HALL,
    description:
      'The premier hall of residence, the oldest of the traditional halls.',
    lat: 5.6497,
    lng: -0.1852,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'South-east of the library, beside the Legon Hall annexes.',
  },
  {
    slug: 'akuafo-hall',
    name: 'Akuafo Hall',
    category: LocationCategory.HOSTEL_HALL,
    description:
      'Traditional mixed hall of residence with a well-known central courtyard.',
    lat: 5.6503,
    lng: -0.1885,
    photos: [IMG(PHOTO.garden)],
    buildingNotes: 'West of the main avenue, opposite Legon Hall.',
  },
  {
    slug: 'volta-hall',
    name: 'Volta Hall',
    category: LocationCategory.HOSTEL_HALL,
    description: 'The traditional hall of residence for women.',
    lat: 5.6524,
    lng: -0.1889,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'North-west quadrant, near the Akuafo Hall annexes.',
  },
  {
    slug: 'mensah-sarbah-hall',
    name: 'Mensah Sarbah Hall',
    category: LocationCategory.HOSTEL_HALL,
    description:
      'Mixed traditional hall of residence at the southern end of campus.',
    lat: 5.6471,
    lng: -0.1855,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'Closest of the traditional halls to the main gate.',
  },
  {
    slug: 'jones-quartey-building',
    name: 'Jones Quartey Building (JQB)',
    category: LocationCategory.LECTURE_HALL,
    description:
      'Central lecture block carrying much of the humanities timetable.',
    lat: 5.6516,
    lng: -0.1848,
    photos: [IMG(PHOTO.city)],
    buildingNotes:
      'Lecture theatres are numbered JQB 1–5 from the ground floor up.',
  },
  {
    slug: 'nll-lecture-block',
    name: 'N Block Lecture Theatre (NLL)',
    category: LocationCategory.LECTURE_HALL,
    description:
      'Large-capacity lecture theatres used for first-year and faculty-wide courses.',
    lat: 5.6521,
    lng: -0.184,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'Beside the JQB, sharing the same walkway.',
  },
  {
    slug: 'department-of-computer-science',
    name: 'Department of Computer Science',
    category: LocationCategory.DEPARTMENT,
    description:
      'Part of the School of Physical and Mathematical Sciences; labs and staff offices.',
    lat: 5.6547,
    lng: -0.1897,
    photos: [IMG(PHOTO.city)],
    buildingNotes:
      'Within the science block cluster, north-west of the library.',
  },
  {
    slug: 'university-of-ghana-business-school',
    name: 'University of Ghana Business School (UGBS)',
    category: LocationCategory.DEPARTMENT,
    description:
      'Business school complex housing accounting, finance and marketing departments.',
    lat: 5.6556,
    lng: -0.1876,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'North of the Great Hall, off the ring road.',
  },
  {
    slug: 'school-of-law',
    name: 'University of Ghana School of Law',
    category: LocationCategory.DEPARTMENT,
    description:
      'Law faculty building with its own moot court and law library.',
    lat: 5.6489,
    lng: -0.188,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'South-west of the Balme Library.',
  },
  {
    slug: 'institute-of-african-studies',
    name: 'Institute of African Studies',
    category: LocationCategory.DEPARTMENT,
    description:
      'Research institute with a performance space used for drumming and dance.',
    lat: 5.6512,
    lng: -0.1897,
    photos: [IMG(PHOTO.garden)],
    buildingNotes: 'West of the avenue, near the Volta Hall approach.',
  },
  {
    slug: 'main-administration-building',
    name: 'Main Administration Building (Registry)',
    category: LocationCategory.ADMINISTRATION,
    description:
      'Registry and central administration — admissions, records and fees.',
    lat: 5.6532,
    lng: -0.1878,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'Adjacent to the Great Hall forecourt.',
  },
  {
    slug: 'university-of-ghana-medical-centre',
    name: 'University of Ghana Medical Centre',
    category: LocationCategory.OTHER,
    description: 'Teaching hospital and campus health facility.',
    lat: 5.6584,
    lng: -0.1928,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'North-west corner of campus, on its own access road.',
  },
  {
    slug: 'university-of-ghana-stadium',
    name: 'University of Ghana Sports Stadium',
    category: LocationCategory.PARK_FIELD,
    description:
      'Main athletics track and football pitch, used for inter-hall games.',
    lat: 5.6533,
    lng: -0.1932,
    photos: [IMG(PHOTO.forest)],
    buildingNotes: 'West of campus beside the sports directorate.',
  },
  {
    slug: 'legon-botanical-gardens',
    name: 'Legon Botanical Gardens',
    category: LocationCategory.PARK_FIELD,
    description:
      'Public gardens and canopy walkway on the eastern edge of the campus lands.',
    lat: 5.6464,
    lng: -0.1791,
    photos: [IMG(PHOTO.forest)],
    buildingNotes: 'Separate paid entrance off the Haatso–Atomic road side.',
  },
  {
    slug: 'night-market',
    name: 'Night Market',
    category: LocationCategory.OTHER,
    description:
      'The student food and provisions market that runs into the evening.',
    lat: 5.6479,
    lng: -0.1888,
    photos: [IMG(PHOTO.market)],
    buildingNotes: 'Behind the Sarbah and Legon Hall annexes.',
  },
  {
    slug: 'bush-canteen',
    name: 'Bush Canteen',
    category: LocationCategory.OTHER,
    description:
      'Long-standing cluster of chop bars, shops and services near the halls.',
    lat: 5.6558,
    lng: -0.1848,
    photos: [IMG(PHOTO.market)],
    buildingNotes: 'North-east of Commonwealth Hall, off the ring road.',
  },
  {
    slug: 'elizabeth-frances-sey-hall',
    name: 'Elizabeth Frances Sey Hall',
    category: LocationCategory.HOSTEL_HALL,
    description:
      'One of the Diaspora halls of residence on the northern edge of campus.',
    lat: 5.6598,
    lng: -0.1874,
    photos: [IMG(PHOTO.city)],
    buildingNotes: 'Diaspora cluster, alongside Hilla Limann Hall.',
  },
];
