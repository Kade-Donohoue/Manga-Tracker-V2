import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb } from '@/db';
import { openAPI, apiKey, admin } from 'better-auth/plugins';
import { Environment } from '@/env';

export const createAuth = (env: Environment) => {
  const db = createDb(env);
  return betterAuth({
    appName: 'Manga Tracker',
    emailAndPassword: {
      enabled: true,
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
      }
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
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:8787',
      'https://devmanga.kdonohoue.com',
      'https://devmanga.kdonohoue.com',
    ],
  });
};
