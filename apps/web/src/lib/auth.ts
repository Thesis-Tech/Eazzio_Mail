import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP, bearer } from 'better-auth/plugins';
import { dash } from '@better-auth/infra';
import { prisma } from './prisma';
import { sendEmailOtp } from './email-dispatcher';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    'eazzio_mail_better_auth_production_secret_key_32_characters_minimum',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      recoveryEmail: {
        type: 'string',
        required: false,
        input: true,
      },
      recoveryEmailVerified: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      telegramChatId: {
        type: 'string',
        required: false,
      },
      telegramUsername: {
        type: 'string',
        required: false,
      },
      telegramLinkedAt: {
        type: 'date',
        required: false,
      },
    },
  },
  plugins: [
    dash(),
    bearer(),
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 minutes TTL
      allowedAttempts: 5,
      storeOTP: 'hashed',
      resendStrategy: 'rotate',
      sendVerificationOnSignUp: false,
      async sendVerificationOTP({ email, otp, type }) {
        await sendEmailOtp({
          to: email,
          otp,
          type,
        });
      },
    }),
  ],
});
