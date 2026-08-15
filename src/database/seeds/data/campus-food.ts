import { ALL_WEEK, IMG, LONG_DAY, PHOTO } from './shared';

/**
 * Food joints on and around the University of Ghana, Legon campus. These sit
 * alongside the city venues in `restaurants.ts` rather than replacing them —
 * the tourism product still serves Accra, Kumasi and Cape Coast.
 *
 * `nearestLocation` is a slug from `campus-locations.ts`; the seeder resolves it
 * to an id. Phone numbers are placeholders in the Ghana +233 20 range and are
 * published only where `contactConsent` is true, which is the point of seeding
 * a mix of both.
 */
export const seedCampusRestaurants = [
  {
    slug: 'bush-canteen-chop-bar',
    name: 'Bush Canteen Chop Bar',
    cuisine: 'Ghanaian',
    priceTier: 1,
    description:
      'The staple chop bar at Bush Canteen — waakye, jollof and fufu from morning.',
    lat: 5.6557,
    lng: -0.1846,
    heroImageUrl: IMG(PHOTO.localFood),
    images: [IMG(PHOTO.localFood)],
    dietary: ['HALAL'],
    openingHours: LONG_DAY,
    nearestLocation: 'bush-canteen',
    phone: '+233201110001',
    whatsapp: '233201110001',
    contactConsent: true,
    menu: [
      {
        category: 'Mains',
        items: [
          {
            name: 'Waakye with fish',
            priceMinor: 2500,
            photoUrl: IMG(PHOTO.localFood),
          },
          { name: 'Jollof with chicken', priceMinor: 3000 },
          { name: 'Fufu with light soup', priceMinor: 3500 },
        ],
      },
      {
        category: 'Drinks',
        items: [{ name: 'Sobolo', priceMinor: 500 }],
      },
    ],
    ratingAvg: 4.5,
    ratingCount: 214,
  },
  {
    slug: 'night-market-waakye',
    name: 'Night Market Waakye',
    cuisine: 'Ghanaian',
    priceTier: 1,
    description:
      'Night Market stall that runs late for students coming off evening lectures.',
    lat: 5.6478,
    lng: -0.1889,
    heroImageUrl: IMG(PHOTO.market),
    images: [IMG(PHOTO.market)],
    dietary: ['HALAL'],
    openingHours: LONG_DAY,
    nearestLocation: 'night-market',
    phone: '+233201110002',
    contactConsent: true,
    menu: [
      {
        category: 'Mains',
        items: [
          { name: 'Waakye special', priceMinor: 3000 },
          { name: 'Red red with plantain', priceMinor: 2500 },
          { name: 'Kenkey with fried fish', priceMinor: 2200 },
        ],
      },
    ],
    ratingAvg: 4.4,
    ratingCount: 168,
  },
  {
    slug: 'akuafo-hall-cafeteria',
    name: 'Akuafo Hall Cafeteria',
    cuisine: 'Ghanaian',
    priceTier: 1,
    description:
      'Hall dining room open to all students, with a rotating daily menu.',
    lat: 5.6504,
    lng: -0.1884,
    heroImageUrl: IMG(PHOTO.localFood),
    images: [IMG(PHOTO.localFood)],
    dietary: ['VEGETARIAN', 'HALAL'],
    openingHours: LONG_DAY,
    nearestLocation: 'akuafo-hall',
    phone: '+233201110003',
    // Deliberately unconsented — the API must publish no number for this row.
    contactConsent: false,
    menu: [
      {
        category: 'Mains',
        items: [
          { name: 'Rice and stew', priceMinor: 2000 },
          { name: 'Banku with okro stew', priceMinor: 2500 },
        ],
      },
    ],
    ratingAvg: 3.9,
    ratingCount: 96,
  },
  {
    slug: 'legon-hall-annex-canteen',
    name: 'Legon Hall Annex Canteen',
    cuisine: 'Ghanaian',
    priceTier: 1,
    description: 'Quick canteen beside the Legon Hall annexes, busy at lunch.',
    lat: 5.6494,
    lng: -0.1849,
    heroImageUrl: IMG(PHOTO.localFood),
    images: [IMG(PHOTO.localFood)],
    dietary: ['HALAL'],
    openingHours: ALL_WEEK,
    nearestLocation: 'legon-hall',
    phone: '+233201110004',
    contactConsent: true,
    menu: [
      {
        category: 'Mains',
        items: [
          { name: 'Fried rice and chicken', priceMinor: 3500 },
          { name: 'Yam and egg stew', priceMinor: 2200 },
        ],
      },
    ],
    ratingAvg: 4.1,
    ratingCount: 74,
  },
  {
    slug: 'balme-library-coffee-shop',
    name: 'Balme Library Coffee Shop',
    cuisine: 'Cafe',
    priceTier: 2,
    description:
      'Coffee, pastries and sandwiches for long reading-room sessions.',
    lat: 5.6506,
    lng: -0.1872,
    heroImageUrl: IMG(PHOTO.garden),
    images: [IMG(PHOTO.garden)],
    dietary: ['VEGETARIAN', 'VEGAN'],
    openingHours: ALL_WEEK,
    nearestLocation: 'balme-library',
    phone: '+233201110005',
    email: 'hello@balmecoffee.test',
    contactConsent: true,
    menu: [
      {
        category: 'Coffee',
        items: [
          { name: 'Americano', priceMinor: 1800 },
          { name: 'Cappuccino', priceMinor: 2200 },
        ],
      },
      {
        category: 'Snacks',
        items: [
          { name: 'Chicken sandwich', priceMinor: 3500 },
          { name: 'Meat pie', priceMinor: 1200 },
        ],
      },
    ],
    ratingAvg: 4.3,
    ratingCount: 131,
  },
  {
    slug: 'commonwealth-hall-grill',
    name: 'Commonwealth Hall Grill',
    cuisine: 'Grill',
    priceTier: 2,
    description:
      'Evening kebab and khebab grill on the Commonwealth Hall approach.',
    lat: 5.6537,
    lng: -0.1852,
    heroImageUrl: IMG(PHOTO.localFood),
    images: [IMG(PHOTO.localFood)],
    dietary: ['HALAL'],
    openingHours: ALL_WEEK,
    nearestLocation: 'commonwealth-hall',
    phone: '+233201110006',
    whatsapp: '233201110006',
    contactConsent: true,
    menu: [
      {
        category: 'Grill',
        items: [
          { name: 'Beef khebab (3 sticks)', priceMinor: 2000 },
          { name: 'Grilled chicken quarter', priceMinor: 3500 },
          { name: 'Kelewele', priceMinor: 1500 },
        ],
      },
    ],
    ratingAvg: 4.6,
    ratingCount: 188,
  },
  {
    slug: 'ugbs-food-court',
    name: 'UGBS Food Court',
    cuisine: 'International',
    priceTier: 2,
    description:
      'Food court beside the Business School with several vendors under one roof.',
    lat: 5.6553,
    lng: -0.1872,
    heroImageUrl: IMG(PHOTO.fineDining),
    images: [IMG(PHOTO.fineDining)],
    dietary: ['VEGETARIAN', 'HALAL'],
    openingHours: ALL_WEEK,
    nearestLocation: 'university-of-ghana-business-school',
    phone: '+233201110007',
    email: 'orders@ugbsfoodcourt.test',
    contactConsent: true,
    menu: [
      {
        category: 'Mains',
        items: [
          { name: 'Chicken shawarma', priceMinor: 3000 },
          { name: 'Fried rice combo', priceMinor: 3800 },
          { name: 'Veg noodles', priceMinor: 2800 },
        ],
      },
    ],
    ratingAvg: 4.2,
    ratingCount: 152,
  },
  {
    slug: 'sarbah-park-pizza',
    name: 'Sarbah Park Pizza',
    cuisine: 'Italian',
    priceTier: 2,
    description: 'Small pizza counter near Mensah Sarbah Hall, popular late.',
    lat: 5.6474,
    lng: -0.1858,
    heroImageUrl: IMG(PHOTO.garden),
    images: [IMG(PHOTO.garden)],
    dietary: ['VEGETARIAN'],
    openingHours: ALL_WEEK,
    nearestLocation: 'mensah-sarbah-hall',
    phone: '+233201110008',
    // Also unconsented, so the consent gate is exercised on more than one row.
    contactConsent: false,
    menu: [
      {
        category: 'Pizza',
        items: [
          { name: 'Margherita (personal)', priceMinor: 4000 },
          { name: 'Chicken barbecue (personal)', priceMinor: 5000 },
        ],
      },
    ],
    ratingAvg: 4.0,
    ratingCount: 63,
  },
];
