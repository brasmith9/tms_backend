import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  baseUrl: string;
}

/**
 * Sends transactional email through Brevo's HTTP API. If no API key is
 * configured the send is skipped with a warning, so the app runs in
 * environments where email isn't set up yet.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly http: AxiosInstance;
  private readonly config: BrevoConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<BrevoConfig>('brevo')!;
    this.http = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'api-key': this.config.apiKey,
        'content-type': 'application/json',
      },
    });
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your Voyago password',
      html:
        `<p>We received a request to reset your Voyago password.</p>` +
        `<p><a href="${resetUrl}">Click here to choose a new password</a>. ` +
        `This link expires in 1 hour.</p>` +
        `<p>If you didn't request this, you can ignore this email.</p>`,
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.config.apiKey) {
      this.logger.warn(
        `BREVO_API_KEY not set; skipping email "${input.subject}" to ${input.to}`,
      );
      return;
    }
    await this.http.post('/smtp/email', {
      sender: { email: this.config.senderEmail, name: this.config.senderName },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
    });
  }
}
