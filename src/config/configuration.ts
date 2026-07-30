export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  databaseUrl: process.env.DATABASE_URL!,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessTtl: process.env.JWT_ACCESS_TTL!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshTtl: process.env.JWT_REFRESH_TTL!,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY!,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY!,
    baseUrl: process.env.PAYSTACK_BASE_URL!,
  },
  booking: {
    seatHoldMinutes: parseInt(process.env.SEAT_HOLD_MINUTES ?? '15', 10),
    cancellationWindowHours: parseInt(
      process.env.CANCELLATION_WINDOW_HOURS ?? '48',
      10,
    ),
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY ?? '',
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? 'no-reply@voyago.test',
    senderName: process.env.BREVO_SENDER_NAME ?? 'Voyago',
    baseUrl: process.env.BREVO_BASE_URL ?? 'https://api.brevo.com/v3',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  frontendResetUrl:
    process.env.FRONTEND_RESET_URL ?? 'http://localhost:5173/reset-password',
});

export type AppConfig = ReturnType<typeof configuration>;
