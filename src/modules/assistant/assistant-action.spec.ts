import {
  GroundedPlace,
  GroundingIndex,
  buildLookups,
  groundActions,
  parseAction,
} from './assistant-action';

const HALL: GroundedPlace = {
  id: 'loc-1',
  slug: 'commonwealth-hall',
  name: 'Commonwealth Hall',
  lat: 5.654,
  lng: -0.1855,
};

const CONSENTED: GroundedPlace = {
  id: 'rest-1',
  slug: 'commonwealth-khebab',
  name: 'Commonwealth Khebab',
  lat: 5.6537,
  lng: -0.1852,
  canCall: true,
  canWhatsApp: true,
};

const WITHHELD: GroundedPlace = {
  id: 'rest-2',
  slug: 'akuafo-cafeteria',
  name: 'Akuafo Cafeteria',
  lat: 5.6504,
  lng: -0.1884,
  canCall: false,
  canWhatsApp: false,
};

const sets = (over: Partial<GroundingIndex> = {}): GroundingIndex => ({
  locations: [HALL],
  foodJoints: [CONSENTED, WITHHELD],
  ...over,
});

const parse = (value: unknown, index = sets()) =>
  parseAction(value, buildLookups(index));

describe('parseAction', () => {
  it('accepts each member of the union when it resolves', () => {
    expect(
      parse({ type: 'OPEN_LOCATION', slug: HALL.slug, name: HALL.name }),
    ).toEqual({ type: 'OPEN_LOCATION', slug: HALL.slug, name: HALL.name });

    expect(
      parse({
        type: 'OPEN_FOOD_JOINT',
        slug: CONSENTED.slug,
        name: CONSENTED.name,
      }),
    ).toEqual({
      type: 'OPEN_FOOD_JOINT',
      slug: CONSENTED.slug,
      name: CONSENTED.name,
    });

    expect(
      parse({ type: 'SHOW_DIRECTIONS', lat: 0, lng: 0, name: HALL.name }),
    ).toEqual({
      type: 'SHOW_DIRECTIONS',
      lat: HALL.lat,
      lng: HALL.lng,
      name: HALL.name,
    });

    expect(
      parse({
        type: 'CONTACT_FOOD_JOINT',
        slug: CONSENTED.slug,
        name: CONSENTED.name,
        channel: 'CALL',
      }),
    ).toEqual({
      type: 'CONTACT_FOOD_JOINT',
      slug: CONSENTED.slug,
      name: CONSENTED.name,
      channel: 'CALL',
    });

    expect(
      parse({
        type: 'SAVE_FAVORITE',
        favoriteType: 'LOCATION',
        itemId: HALL.id,
        name: HALL.name,
      }),
    ).toEqual({
      type: 'SAVE_FAVORITE',
      favoriteType: 'LOCATION',
      itemId: HALL.id,
      name: HALL.name,
    });
  });

  describe('server-authoritative fields', () => {
    it('overwrites a name the model got wrong', () => {
      expect(
        parse({
          type: 'OPEN_LOCATION',
          slug: HALL.slug,
          name: 'Commonwealth Hall of Wizardry',
        }),
      ).toEqual({ type: 'OPEN_LOCATION', slug: HALL.slug, name: HALL.name });
    });

    it('overwrites invented coordinates on SHOW_DIRECTIONS', () => {
      // A map pin must never come from the model — these are London's.
      const action = parse({
        type: 'SHOW_DIRECTIONS',
        lat: 51.5,
        lng: -0.12,
        name: 'commonwealth   HALL',
      });

      expect(action).toEqual({
        type: 'SHOW_DIRECTIONS',
        lat: HALL.lat,
        lng: HALL.lng,
        name: HALL.name,
      });
    });

    it('drops SHOW_DIRECTIONS for a name that resolves to nothing', () => {
      expect(
        parse({
          type: 'SHOW_DIRECTIONS',
          lat: 5.65,
          lng: -0.18,
          name: 'Hogwarts Hall',
        }),
      ).toBeNull();
    });

    it('resolves SHOW_DIRECTIONS against food joints too', () => {
      expect(
        parse({
          type: 'SHOW_DIRECTIONS',
          lat: 0,
          lng: 0,
          name: CONSENTED.name,
        }),
      ).toMatchObject({ lat: CONSENTED.lat, lng: CONSENTED.lng });
    });
  });

  describe('rejections', () => {
    it('rejects a type outside the closed set', () => {
      expect(
        parse({ type: 'ORDER_TAKEAWAY', slug: CONSENTED.slug, name: 'x' }),
      ).toBeNull();
      // The pre-doc names are gone and must not be silently accepted.
      expect(parse({ type: 'GET_DIRECTIONS', locationId: HALL.id })).toBeNull();
      expect(
        parse({ type: 'CALL_FOOD_JOINT', restaurantId: CONSENTED.id }),
      ).toBeNull();
    });

    it('rejects an invented location slug', () => {
      expect(
        parse({ type: 'OPEN_LOCATION', slug: 'wakanda-hall', name: 'Wakanda' }),
      ).toBeNull();
    });

    it('rejects a food joint slug the model was never given', () => {
      expect(
        parse({ type: 'OPEN_FOOD_JOINT', slug: 'made-up', name: 'Made Up' }),
      ).toBeNull();
    });

    it('rejects free text and other non-objects', () => {
      for (const value of ['call the chop bar', null, 42, ['OPEN_LOCATION']]) {
        expect(parse(value)).toBeNull();
      }
    });

    it('rejects a well-typed action with a missing or mistyped field', () => {
      expect(parse({ type: 'OPEN_LOCATION' })).toBeNull();
      expect(
        parse({ type: 'SHOW_DIRECTIONS', lat: 5.6, lng: -0.18, name: 12 }),
      ).toBeNull();
      expect(
        parse({ type: 'SAVE_FAVORITE', favoriteType: 'TOUR', itemId: HALL.id }),
      ).toBeNull();
    });

    it('rejects SAVE_FAVORITE whose itemId is the wrong kind of record', () => {
      // A real restaurant id, but declared as a LOCATION.
      expect(
        parse({
          type: 'SAVE_FAVORITE',
          favoriteType: 'LOCATION',
          itemId: CONSENTED.id,
          name: CONSENTED.name,
        }),
      ).toBeNull();
    });
  });

  describe('consent gate', () => {
    it('allows both channels for a fully consenting vendor', () => {
      for (const channel of ['CALL', 'WHATSAPP']) {
        expect(
          parse({
            type: 'CONTACT_FOOD_JOINT',
            slug: CONSENTED.slug,
            name: CONSENTED.name,
            channel,
          }),
        ).toMatchObject({ channel });
      }
    });

    it('refuses contact for a real joint that withheld consent', () => {
      // It can still be opened — only the contact action is gated.
      expect(
        parse({
          type: 'OPEN_FOOD_JOINT',
          slug: WITHHELD.slug,
          name: WITHHELD.name,
        }),
      ).not.toBeNull();

      for (const channel of ['CALL', 'WHATSAPP']) {
        expect(
          parse({
            type: 'CONTACT_FOOD_JOINT',
            slug: WITHHELD.slug,
            name: WITHHELD.name,
            channel,
          }),
        ).toBeNull();
      }
    });

    it('refuses a channel the vendor did not publish', () => {
      const callOnly: GroundedPlace = {
        ...CONSENTED,
        canCall: true,
        canWhatsApp: false,
      };
      const index = sets({ foodJoints: [callOnly] });

      expect(
        parse(
          {
            type: 'CONTACT_FOOD_JOINT',
            slug: callOnly.slug,
            name: callOnly.name,
            channel: 'CALL',
          },
          index,
        ),
      ).not.toBeNull();
      expect(
        parse(
          {
            type: 'CONTACT_FOOD_JOINT',
            slug: callOnly.slug,
            name: callOnly.name,
            channel: 'WHATSAPP',
          },
          index,
        ),
      ).toBeNull();
    });

    it('rejects an unknown channel', () => {
      expect(
        parse({
          type: 'CONTACT_FOOD_JOINT',
          slug: CONSENTED.slug,
          name: CONSENTED.name,
          channel: 'SMS',
        }),
      ).toBeNull();
    });
  });
});

describe('groundActions', () => {
  it('keeps the real ones and drops the invented ones', () => {
    expect(
      groundActions(
        [
          { type: 'OPEN_LOCATION', slug: HALL.slug, name: HALL.name },
          { type: 'OPEN_LOCATION', slug: 'hogwarts-hall', name: 'Hogwarts' },
          {
            type: 'OPEN_FOOD_JOINT',
            slug: CONSENTED.slug,
            name: CONSENTED.name,
          },
        ],
        sets(),
      ),
    ).toEqual([
      { type: 'OPEN_LOCATION', slug: HALL.slug, name: HALL.name },
      {
        type: 'OPEN_FOOD_JOINT',
        slug: CONSENTED.slug,
        name: CONSENTED.name,
      },
    ]);
  });

  it('de-duplicates repeated actions but keeps order', () => {
    const open = {
      type: 'OPEN_FOOD_JOINT',
      slug: CONSENTED.slug,
      name: CONSENTED.name,
    };
    expect(
      groundActions(
        [
          open,
          { type: 'OPEN_LOCATION', slug: HALL.slug, name: HALL.name },
          open,
        ],
        sets(),
      ),
    ).toEqual([
      open,
      { type: 'OPEN_LOCATION', slug: HALL.slug, name: HALL.name },
    ]);
  });

  it('returns an empty array when the model sends a non-array', () => {
    expect(groundActions('OPEN_LOCATION commonwealth-hall', sets())).toEqual(
      [],
    );
    expect(groundActions(undefined, sets())).toEqual([]);
  });
});
