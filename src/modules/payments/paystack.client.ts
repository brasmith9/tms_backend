import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

export function isValidPaystackSignature(
  raw: Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface PaystackInit {
  authorizationUrl: string;
  reference: string;
}

interface PaystackConfig {
  secretKey: string;
  baseUrl: string;
}

interface InitializeResponse {
  data: { authorization_url: string; reference: string };
}

interface VerifyResponse {
  data: { status: string; amount: number };
}

@Injectable()
export class PaystackClient {
  private readonly http: AxiosInstance;
  private readonly secret: string;

  constructor(config: ConfigService) {
    const p = config.get<PaystackConfig>('paystack')!;
    this.secret = p.secretKey;
    this.http = axios.create({
      baseURL: p.baseUrl,
      headers: { Authorization: `Bearer ${p.secretKey}` },
    });
  }

  async initializeTransaction(input: {
    email: string;
    amountMinor: number;
    reference: string;
    currency: string;
  }): Promise<PaystackInit> {
    const { data } = await this.http.post<InitializeResponse>(
      '/transaction/initialize',
      {
        email: input.email,
        amount: input.amountMinor,
        reference: input.reference,
        currency: input.currency,
      },
    );
    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  }

  async verifyTransaction(
    reference: string,
  ): Promise<{ status: string; amount: number }> {
    const { data } = await this.http.get<VerifyResponse>(
      `/transaction/verify/${reference}`,
    );
    return { status: data.data.status, amount: data.data.amount };
  }

  async createRefund(reference: string): Promise<void> {
    await this.http.post('/refund', { transaction: reference });
  }

  verifySignature(raw: Buffer, signature: string): boolean {
    return isValidPaystackSignature(raw, signature, this.secret);
  }
}
