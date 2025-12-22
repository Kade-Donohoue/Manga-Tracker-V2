import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables from .env locally (Node only)
dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID as string;
const CLOUDFLARE_DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID as string;
const CLOUDFLARE_D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN as string;

export default defineConfig({
  // D1 is SQLite-compatible
  dialect: 'sqlite',
  // Path to your Drizzle schema
  schema: './src/db/schema.ts',
  out: './src/db/migrations/',
  driver: 'd1-http',
  dbCredentials: {
    accountId: CLOUDFLARE_ACCOUNT_ID,
    databaseId: CLOUDFLARE_DATABASE_ID,
    token: CLOUDFLARE_D1_TOKEN,
  },
});
