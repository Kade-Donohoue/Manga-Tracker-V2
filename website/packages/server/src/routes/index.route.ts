import { createRouter } from '@/lib/create-app';

const router = createRouter();

router.get('/api', async (c) => {
  return c.json({ message: "Tomari, Manga Tracker's Api" }, 200);
});

export default router;
