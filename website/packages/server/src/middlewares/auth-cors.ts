import { cors } from 'hono/cors';

export default cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8787',
    'https://devmanga.kdonohoue.com',
    'https://devmanga.kdonohoue.com',
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
});
