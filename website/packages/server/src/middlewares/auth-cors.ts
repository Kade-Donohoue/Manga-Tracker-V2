import { cors } from 'hono/cors';

export default cors({
  origin: (origin, c) => {
    if (!origin) return undefined;

    const allowed = c.env.TRUSTED_ORIGINS;
    const result = allowed.includes(origin) ? origin : '';

    return result;
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
});
