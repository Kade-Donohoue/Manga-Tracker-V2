import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb } from '@/db';
import { apiKey } from '@better-auth/api-key';
import { openAPI, admin } from 'better-auth/plugins';
import { Environment } from '@/env';
import { sendEmail } from '@/email';
import { waitUntil } from 'cloudflare:workers';

const encoder = new TextEncoder();

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 20000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const hash = new Uint8Array(derived);

  console.log('stored hash:', hash);

  return `${btoa(String.fromCharCode(...salt))}.${btoa(String.fromCharCode(...hash))}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltB64, hashB64] = stored.split('.');

  console.log('stored hash:', hashB64);

  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 20000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const actual = new Uint8Array(derived);

  return actual.every((v, i) => v === expected[i]);
}

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
      password: {
        hash: async (password) => {
          return hashPassword(password);
        },
        verify: async ({ hash, password }) => {
          return verifyPassword(password, hash);
        },
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
      expiresIn: 60 * 60 * 24 * 21,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: 'compact',
      },
    },
    logger: {
      level: 'debug',
      log: (level, message, ...args) => {
        console.log(`[${level}] ${message}`, ...args);
      },
    },
  });
};
