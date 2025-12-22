import { drizzle } from 'drizzle-orm/d1';
import { Environment } from '@/env';
import * as schema from '@/db/schema';

export function createDb(env: Environment) {
  return drizzle(env.DB, { schema });
}
