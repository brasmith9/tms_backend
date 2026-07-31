/**
 * Reviews for the eight best-known tours. Each row becomes one COMPLETED booking
 * plus one review, because reviews.service.ts requires a unique completed booking
 * per review. The seed recomputes ratingAvg/ratingCount on these tours from the
 * rows below, so aggregates and rows always reconcile.
 */
export interface SeedReview {
  /** Matches a slug in seedTours. */
  tourSlug: string;
  /** Matches an email in seedReviewers. */
  reviewer: string;
  rating: number;
  body: string;
}

export const seedReviews: SeedReview[] = [
  // ---- Kakum Canopy Walk ----
  {
    tourSlug: 'kakum-canopy-walk',
    reviewer: 'reviewer01@voyago.test',
    rating: 5,
    body: 'The walkway is higher than the photos suggest. Go on the first slot of the morning — we had the whole canopy to ourselves and heard hornbills.',
  },
  {
    tourSlug: 'kakum-canopy-walk',
    reviewer: 'reviewer02@voyago.test',
    rating: 4,
    body: 'Excellent guide who knew the forest properly. Only knocking a star off because the climb to the first platform is steeper than advertised.',
  },
  {
    tourSlug: 'kakum-canopy-walk',
    reviewer: 'reviewer03@voyago.test',
    rating: 5,
    body: 'Did this with two nervous teenagers and both loved it. The bridges sway but feel completely solid.',
  },
  {
    tourSlug: 'kakum-canopy-walk',
    reviewer: 'reviewer04@voyago.test',
    rating: 4,
    body: 'Worth the drive from Cape Coast. Bring water and proper shoes, the trail is humid.',
  },
  {
    tourSlug: 'kakum-canopy-walk',
    reviewer: 'reviewer05@voyago.test',
    rating: 5,
    body: 'Three hours flew by. Our guide pointed out medicinal plants on the walk back that I would have walked straight past.',
  },
  {
    tourSlug: 'kakum-canopy-walk',
    reviewer: 'reviewer06@voyago.test',
    rating: 3,
    body: 'The canopy walk itself is superb but it was very crowded by mid-morning and you get moved along quickly.',
  },

  // ---- Cape Coast Castle ----
  {
    tourSlug: 'cape-coast-castle-tour',
    reviewer: 'reviewer07@voyago.test',
    rating: 5,
    body: 'Difficult and necessary. The guide handled the dungeons and the Door of No Return with real care. Allow time to sit afterwards.',
  },
  {
    tourSlug: 'cape-coast-castle-tour',
    reviewer: 'reviewer08@voyago.test',
    rating: 5,
    body: 'One of the most affecting places I have been. The guiding was factual and unhurried, never sensationalised.',
  },
  {
    tourSlug: 'cape-coast-castle-tour',
    reviewer: 'reviewer09@voyago.test',
    rating: 4,
    body: 'Powerful tour. The museum upstairs is worth the extra half hour that most people skip.',
  },
  {
    tourSlug: 'cape-coast-castle-tour',
    reviewer: 'reviewer10@voyago.test',
    rating: 5,
    body: 'Went as a family with Ghanaian and diaspora relatives. Our guide gave everyone space to process it in their own way.',
  },
  {
    tourSlug: 'cape-coast-castle-tour',
    reviewer: 'reviewer11@voyago.test',
    rating: 4,
    body: 'Essential. Two hours is about right, though the dungeons are hot and airless so pace yourself.',
  },
  {
    tourSlug: 'cape-coast-castle-tour',
    reviewer: 'reviewer12@voyago.test',
    rating: 5,
    body: 'The guide answered every question honestly, including the uncomfortable ones about local complicity. Deeply respectful.',
  },

  // ---- Accra City Heritage ----
  {
    tourSlug: 'accra-city-heritage-tour',
    reviewer: 'reviewer13@voyago.test',
    rating: 4,
    body: 'A solid orientation to Accra on day one. Nkrumah Mausoleum and the museum in a single morning works well.',
  },
  {
    tourSlug: 'accra-city-heritage-tour',
    reviewer: 'reviewer14@voyago.test',
    rating: 5,
    body: 'Our guide grew up in Osu and the personal history made it far better than a standard city tour.',
  },
  {
    tourSlug: 'accra-city-heritage-tour',
    reviewer: 'reviewer15@voyago.test',
    rating: 4,
    body: 'Good value for five hours. Traffic between stops ate more time than expected — not the operator’s fault.',
  },
  {
    tourSlug: 'accra-city-heritage-tour',
    reviewer: 'reviewer16@voyago.test',
    rating: 3,
    body: 'Informative but tries to cover too much. I would rather have spent longer at the museum and dropped a stop.',
  },
  {
    tourSlug: 'accra-city-heritage-tour',
    reviewer: 'reviewer17@voyago.test',
    rating: 5,
    body: 'Air-conditioned van, punctual pickup, genuinely knowledgeable guide. Exactly what was described.',
  },
  {
    tourSlug: 'accra-city-heritage-tour',
    reviewer: 'reviewer18@voyago.test',
    rating: 4,
    body: 'Independence Square is quiet unless there is an event on, but the Nkrumah site more than makes up for it.',
  },

  // ---- Manhyia Palace ----
  {
    tourSlug: 'manhyia-palace-tour',
    reviewer: 'reviewer19@voyago.test',
    rating: 5,
    body: 'The Ashanti royal history is extraordinary and the museum guides know it inside out. Photography is restricted, so look properly.',
  },
  {
    tourSlug: 'manhyia-palace-tour',
    reviewer: 'reviewer20@voyago.test',
    rating: 4,
    body: 'Compact but rich. The regalia and the account of the 1900 war were the highlights.',
  },
  {
    tourSlug: 'manhyia-palace-tour',
    reviewer: 'reviewer21@voyago.test',
    rating: 5,
    body: 'If you only do one thing in Kumasi, do this. Pair it with Kejetia market in the afternoon.',
  },
  {
    tourSlug: 'manhyia-palace-tour',
    reviewer: 'reviewer22@voyago.test',
    rating: 4,
    body: 'Two and a half hours well spent. Dress modestly — it is an active royal residence.',
  },
  {
    tourSlug: 'manhyia-palace-tour',
    reviewer: 'reviewer23@voyago.test',
    rating: 5,
    body: 'Our guide traced the Golden Stool story from start to finish. I understood Ashanti history far better afterwards.',
  },
  {
    tourSlug: 'manhyia-palace-tour',
    reviewer: 'reviewer24@voyago.test',
    rating: 4,
    body: 'Well organised and genuinely interesting. The waxwork figures are dated but the storytelling carries it.',
  },

  // ---- Mole Safari ----
  {
    tourSlug: 'mole-safari-tour',
    reviewer: 'reviewer25@voyago.test',
    rating: 5,
    body: 'Elephants at the waterhole within twenty minutes of setting off. The dawn start is absolutely worth it.',
  },
  {
    tourSlug: 'mole-safari-tour',
    reviewer: 'reviewer01@voyago.test',
    rating: 5,
    body: 'Saw elephants, warthogs, baboons and a huge variety of antelope. The ranger was excellent at spotting.',
  },
  {
    tourSlug: 'mole-safari-tour',
    reviewer: 'reviewer02@voyago.test',
    rating: 4,
    body: 'Five hours in an open vehicle in the heat is demanding but the wildlife delivers. Take a hat.',
  },
  {
    tourSlug: 'mole-safari-tour',
    reviewer: 'reviewer03@voyago.test',
    rating: 5,
    body: 'Getting to Mole is a long haul from Accra, but standing thirty metres from wild elephants justified every hour of it.',
  },
  {
    tourSlug: 'mole-safari-tour',
    reviewer: 'reviewer04@voyago.test',
    rating: 4,
    body: 'Good safari, well run. Wildlife is never guaranteed — we were lucky, the group before us was not.',
  },
  {
    tourSlug: 'mole-safari-tour',
    reviewer: 'reviewer05@voyago.test',
    rating: 5,
    body: 'The walking portion with the armed ranger was the highlight. You notice so much more on foot.',
  },

  // ---- Elmina Castle ----
  {
    tourSlug: 'elmina-castle-tour',
    reviewer: 'reviewer06@voyago.test',
    rating: 5,
    body: 'Older and smaller than Cape Coast Castle, and somehow heavier for it. Superb guiding.',
  },
  {
    tourSlug: 'elmina-castle-tour',
    reviewer: 'reviewer07@voyago.test',
    rating: 4,
    body: 'The contrast between the governor’s quarters above and the dungeons below is the whole story in one building.',
  },
  {
    tourSlug: 'elmina-castle-tour',
    reviewer: 'reviewer08@voyago.test',
    rating: 5,
    body: 'Do both castles if you can. Elmina is the older one and the guides here are every bit as good.',
  },
  {
    tourSlug: 'elmina-castle-tour',
    reviewer: 'reviewer09@voyago.test',
    rating: 4,
    body: 'Two hours, well paced. The view over the fishing harbour from the ramparts is remarkable.',
  },
  {
    tourSlug: 'elmina-castle-tour',
    reviewer: 'reviewer10@voyago.test',
    rating: 5,
    body: 'Our guide was patient with a large group and made sure everyone could hear in the dungeons.',
  },
  {
    tourSlug: 'elmina-castle-tour',
    reviewer: 'reviewer11@voyago.test',
    rating: 4,
    body: 'Sobering and very well presented. Combine it with the harbour tour in the same morning.',
  },

  // ---- Wli Falls ----
  {
    tourSlug: 'wli-waterfalls-hike',
    reviewer: 'reviewer12@voyago.test',
    rating: 5,
    body: 'The colony of fruit bats above the falls is a sight in itself. Easy walk, huge payoff.',
  },
  {
    tourSlug: 'wli-waterfalls-hike',
    reviewer: 'reviewer13@voyago.test',
    rating: 5,
    body: 'Forty minutes of flat forest path and then the falls appear. You can swim at the base — bring a towel.',
  },
  {
    tourSlug: 'wli-waterfalls-hike',
    reviewer: 'reviewer14@voyago.test',
    rating: 4,
    body: 'Lovely, and manageable for all ages. Nine river crossings on bridges, all in good repair.',
  },
  {
    tourSlug: 'wli-waterfalls-hike',
    reviewer: 'reviewer15@voyago.test',
    rating: 5,
    body: 'Went in the rainy season and the volume of water was astonishing. Spray reaches you well before the pool.',
  },
  {
    tourSlug: 'wli-waterfalls-hike',
    reviewer: 'reviewer16@voyago.test',
    rating: 4,
    body: 'Good value and a genuinely beautiful reserve. The community guides are well trained.',
  },
  {
    tourSlug: 'wli-waterfalls-hike',
    reviewer: 'reviewer17@voyago.test',
    rating: 5,
    body: 'The best short hike in Ghana. Add the upper falls if you have the legs for it.',
  },

  // ---- Nzulezo ----
  {
    tourSlug: 'nzulezo-stilt-village-tour',
    reviewer: 'reviewer18@voyago.test',
    rating: 5,
    body: 'The hour-long canoe through the swamp forest is half the experience. Utterly quiet.',
  },
  {
    tourSlug: 'nzulezo-stilt-village-tour',
    reviewer: 'reviewer19@voyago.test',
    rating: 4,
    body: 'A real village, not a display — people live and work there. The guides are clear about what is and is not appropriate to photograph.',
  },
  {
    tourSlug: 'nzulezo-stilt-village-tour',
    reviewer: 'reviewer20@voyago.test',
    rating: 5,
    body: 'Unlike anything else in the country. The entire settlement is built on stilts over the lake.',
  },
  {
    tourSlug: 'nzulezo-stilt-village-tour',
    reviewer: 'reviewer21@voyago.test',
    rating: 4,
    body: 'Long day from Takoradi but worth it. The paddlers work hard — tip them.',
  },
  {
    tourSlug: 'nzulezo-stilt-village-tour',
    reviewer: 'reviewer22@voyago.test',
    rating: 5,
    body: 'Extraordinary. Go in the morning when the wetland is still and the birdlife is active.',
  },
  {
    tourSlug: 'nzulezo-stilt-village-tour',
    reviewer: 'reviewer23@voyago.test',
    rating: 4,
    body: 'The canoe is narrow and you sit low in the water, so pack light and keep valuables in a dry bag.',
  },
];
