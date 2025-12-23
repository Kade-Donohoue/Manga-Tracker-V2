import { cors } from 'hono/cors';

export default cors({
  origin: (origin, c) => {
    if (!origin) return false;

    const allowed = c.env.TRUSTED_ORIGINS;

    return allowed.includes(origin);
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
});
