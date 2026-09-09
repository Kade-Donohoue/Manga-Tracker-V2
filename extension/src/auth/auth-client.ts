import { createAuthClient } from 'better-auth/react';

const baseURL = process.env.PLASMO_PUBLIC_BACKEND_URL ?? 'https://manga.kdonohoue.com';

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
});
