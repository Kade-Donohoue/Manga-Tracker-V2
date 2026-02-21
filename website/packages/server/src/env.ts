import { z } from 'zod';

const EnvSchema = z.object({
  VITE_IMG_URL: z.string(),
  NODE_ENV: z.string().default('development'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  TWITTER_CLIENT_ID: z.string(),
  TWITTER_CLIENT_SECRET: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_PATH: z.string(),
  BETTER_AUTH_ADMIN_USER_ID: z.string(),
  REDIRECT_URI: z.url(),
  PUPPETEER_SERVER: z.string(),
  SERVER_PASSWORD: z.string(),
  TRUSTED_ORIGINS: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.url())),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  SES_FROM: z.email(),
  AWS_REGION: z.string(),
  VAPID_SUBJECT: z.string(),
  VITE_VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
});

export const BindingsSchema = {
  DB: undefined as unknown as D1Database,
  IMG: undefined as unknown as R2Bucket,
  KV: undefined as unknown as KVNamespace,
};

export type Environment = z.infer<typeof EnvSchema> & typeof BindingsSchema;

/**
 * Validate string env vars (but keep bindings as-is).
 */
export function createEnv(env: Record<string, unknown>): Environment {
  // console.log(env);
  const parsed = EnvSchema.safeParse(env);

  if (!parsed.success) {
    const tree = z.treeifyError(parsed.error);
    const props = tree.properties ?? {};

    const msgLines: string[] = [];

    for (const [key, val] of Object.entries(props)) {
      const errors = Array.isArray(val.errors) ? val.errors : ['Unknown error'];

      msgLines.push(`${key}: ${errors.join(', ')}`);
    }

    const msg = `Invalid environment variables:\n${msgLines.join('\n')}`;

    throw new Error(msg);
  }

  return {
    ...parsed.data,
    DB: env.DB as D1Database,
    IMG: env.IMG as R2Bucket,
    KV: env.KV as KVNamespace,
  };
}
