import { createHmac } from 'crypto';
import { isValidPaystackSignature } from './paystack.client';

describe('isValidPaystackSignature', () => {
  const secret = 'sk_test_secret';
  const raw = Buffer.from(
    JSON.stringify({
      event: 'charge.success',
      data: { reference: 'TUR-2026-0007' },
    }),
  );

  it('accepts a correctly HMAC-SHA512 signed body', () => {
    const sig = createHmac('sha512', secret).update(raw).digest('hex');
    expect(isValidPaystackSignature(raw, sig, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = createHmac('sha512', secret).update(raw).digest('hex');
    const tampered = Buffer.from(raw.toString().replace('0007', '9999'));
    expect(isValidPaystackSignature(tampered, sig, secret)).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(isValidPaystackSignature(raw, '', secret)).toBe(false);
  });
});
