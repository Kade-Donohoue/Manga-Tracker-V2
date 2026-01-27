import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb } from '@/db';
import { openAPI, apiKey, admin } from 'better-auth/plugins';
import { Environment } from '@/env';
import { sendEmail } from '@/email';
import { waitUntil } from 'cloudflare:workers';

export const createAuth = (env: Environment) => {
  const db = createDb(env);
  return betterAuth({
    appName: 'Tomari, Manga Tracker',
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        // SES-backed reset password email
        console.log(`Password Reset For ${user.email}`);
        waitUntil(
          sendEmail(env, {
            to: user.email,
            subject: 'Reset your password',
            text: `Click the link to reset your password: ${url}`,
            html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
          })
        );
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // SES-backed verification email
        waitUntil(
          sendEmail(env, {
            to: user.email,
            subject: 'Verify your email address',
            text: `Click the link to verify your email: ${url}`,
            html: `<p>Click the link to verify your email: <a href="${url}">${url}</a></p>`,
          })
        );
      },
      sendOnSignIn: true,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID as string,
        clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        redirectURI: (env.REDIRECT_URI as string) + '/api/auth/callback/google',
      },
      discord: {
        clientId: env.DISCORD_CLIENT_ID as string,
        clientSecret: env.DISCORD_CLIENT_SECRET as string,
        redirectURI: (env.REDIRECT_URI as string) + '/api/auth/callback/discord',
      },
      twitter: {
        clientId: env.TWITTER_CLIENT_ID as string,
        clientSecret: env.TWITTER_CLIENT_SECRET as string,
      },
    },
    database: drizzleAdapter(db, {
      provider: 'sqlite',
    }),
    plugins: [
      openAPI(),
      apiKey({
        enableSessionForAPIKeys: true,
      }),
      admin({
        adminUserIds: [env.BETTER_AUTH_ADMIN_USER_ID],
      }),
    ],
    baseURL: env.BETTER_AUTH_URL,
    basePath: env.BETTER_AUTH_PATH,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.TRUSTED_ORIGINS,
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
  });
};
