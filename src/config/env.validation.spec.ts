import { validateEnv } from './env.validation';

const valid = {
  PORT: '3000',
  CORS_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_SECRET: 'r',
  JWT_REFRESH_TTL: '7d',
  PAYSTACK_SECRET_KEY: 'sk_test_x',
  PAYSTACK_PUBLIC_KEY: 'pk_test_x',
  PAYSTACK_BASE_URL: 'https://api.paystack.co',
  SEAT_HOLD_MINUTES: '15',
  CANCELLATION_WINDOW_HOURS: '48',
};

describe('validateEnv', () => {
  it('passes with a complete, valid environment', () => {
    expect(() => validateEnv(valid)).not.toThrow();
  });

  it('throws when a required secret is missing', () => {
    const missing = { ...valid };
    delete (missing as Partial<typeof valid>).JWT_ACCESS_SECRET;
    expect(() => validateEnv(missing)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('coerces numeric strings to numbers', () => {
    expect(validateEnv(valid).SEAT_HOLD_MINUTES).toBe(15);
  });
});
