import { UserRole } from '../../../modules/users/entities/user.entity';

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
    email: 'vendor1@voyago.test',
    fullName: 'Akosua Boateng',
    role: UserRole.VENDOR,
  },
  {
    email: 'kofi@voyago.test',
    fullName: 'Kofi Mensah',
    role: UserRole.TOURIST,
  },
];

/**
 * Reviewers exist so review rows have real authors. A review requires a unique
 * COMPLETED booking (reviews.service.ts), so each review costs one booking; these
 * accounts carry those bookings and keep them off the demo tourist's trip list.
 */
export const seedReviewers = [
  { email: 'reviewer01@voyago.test', fullName: 'Abena Sarpong' },
  { email: 'reviewer02@voyago.test', fullName: 'Kwabena Adjei' },
  { email: 'reviewer03@voyago.test', fullName: 'Esi Bediako' },
  { email: 'reviewer04@voyago.test', fullName: 'Yaw Ofori' },
  { email: 'reviewer05@voyago.test', fullName: 'Adwoa Tetteh' },
  { email: 'reviewer06@voyago.test', fullName: 'Kojo Amoah' },
  { email: 'reviewer07@voyago.test', fullName: 'Akua Bonsu' },
  { email: 'reviewer08@voyago.test', fullName: 'Kwaku Danso' },
  { email: 'reviewer09@voyago.test', fullName: 'Afia Nkrumah' },
  { email: 'reviewer10@voyago.test', fullName: 'Kwame Agyemang' },
  { email: 'reviewer11@voyago.test', fullName: 'Serwaa Boakye' },
  { email: 'reviewer12@voyago.test', fullName: 'Nana Appiah' },
  { email: 'reviewer13@voyago.test', fullName: 'Maame Yeboah' },
  { email: 'reviewer14@voyago.test', fullName: 'Kofi Asare' },
  { email: 'reviewer15@voyago.test', fullName: 'Ama Darkoa' },
  { email: 'reviewer16@voyago.test', fullName: 'Kwesi Gyamfi' },
  { email: 'reviewer17@voyago.test', fullName: 'Efua Addo' },
  { email: 'reviewer18@voyago.test', fullName: 'Yaa Pokuaa' },
  { email: 'reviewer19@voyago.test', fullName: 'Kojo Baffour' },
  { email: 'reviewer20@voyago.test', fullName: 'Adjoa Antwi' },
  { email: 'reviewer21@voyago.test', fullName: 'Kwadwo Osei' },
  { email: 'reviewer22@voyago.test', fullName: 'Abena Frimpong' },
  { email: 'reviewer23@voyago.test', fullName: 'Yaw Nyantakyi' },
  { email: 'reviewer24@voyago.test', fullName: 'Akosua Owusu' },
  { email: 'reviewer25@voyago.test', fullName: 'Kwame Boadu' },
];
