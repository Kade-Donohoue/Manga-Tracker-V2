import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import { Hono } from 'hono';
import { createDb } from '@/db';
import { subscriptions } from '@/db/schema';
import { createRouter } from '@/lib/create-app';
import { and, eq } from 'drizzle-orm';
import { User } from 'better-auth';
import { requireAuth } from '@/middlewares/require-auth';
import { base64UrlEncode } from '@/utils';

const notifRouter = createRouter();

notifRouter.use('*', requireAuth);

// notifRouter.get('/', (c) => c.text('hi!'));

notifRouter.post('/subscribe/:id', async (c) => {
  const body = await c.req.json<PushSubscription>();
  const currentUser: User = c.get('user');
  const db = createDb(c.env);

  const subscription = await db
    .insert(subscriptions)
    .values({
      id: c.req.param('id'),
      userID: currentUser.id,
      endpoint: body.endpoint,
      expirationTime: body.expirationTime,
      keys: body.keys,
    })
    .onConflictDoUpdate({
      target: [subscriptions.id, subscriptions.userID], // your unique constraint
      set: {
        endpoint: body.endpoint,
        expirationTime: body.expirationTime,
        keys: body.keys,
      },
    })
    .returning()
    .get();

  return c.json({
    id: subscription.id,
  });
});

notifRouter.delete('/unsubscribe/:id', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const subscription = await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.id, c.req.param('id')), eq(subscriptions.userID, currentUser.id)))
    .returning()
    .get();

  return c.json({
    id: subscription?.id,
  });
});

notifRouter.post('/send/:id', async (c) => {
  const db = createDb(c.env);

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, c.req.param('id')))
    .get();

  if (!subscription) {
    return c.json({ Message: `Subscription not found` }, 404);
  }

  // const exampleMessage = await c.req.json<PushMessage>();
  const exampleMessage = {
    data: 'Hello! This can be anything you want including JSON',
    options: { ttl: 900, urgency: 'high' as const },
  };

  const payload = await buildPushPayload(exampleMessage, subscription, {
    subject: c.env.VAPID_SUBJECT,
    publicKey: c.env.VITE_VAPID_PUBLIC_KEY,
    privateKey: c.env.VAPID_PRIVATE_KEY,
  });

  const res = await fetch(subscription.endpoint, payload as RequestInit);

  if (res.status === 404 || res.status === 410) {
    await db.delete(subscriptions).where(eq(subscriptions.id, subscription.id));
  }

  return c.json({
    endpointStatus: res.status,
  });
});

notifRouter.post('/send-user', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const userSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userID, currentUser.id));

  const exampleMessage = {
    data: 'Hello multi-device world',
    options: {
      ttl: 900,
      urgency: 'normal' as const,
    },
  };

  const results = await Promise.all(
    userSubs.map(async (sub) => {
      try {
        const payload = await buildPushPayload(exampleMessage, sub, {
          subject: c.env.VAPID_SUBJECT,
          publicKey: c.env.VITE_VAPID_PUBLIC_KEY,
          privateKey: c.env.VAPID_PRIVATE_KEY,
        });

        const res = await fetch(sub.endpoint, payload as RequestInit);

        if (res.status !== 201) {
          console.log(res.url);
          const body = await res.json();

          console.log(body);
        }

        if (res.status === 404 || res.status === 410) {
          await db.delete(subscriptions).where(eq(subscriptions.id, sub.id));
        }

        return { id: sub.id, status: res.status };
      } catch (err) {
        return { id: sub.id, status: 500 };
      }
    })
  );

  return c.json({ results });
});

// pushRouter.post('/subscribe', async (c) => {
//   const db = createDb(c.env);
//   const sub = await c.req.json();

//   await db.insert(pushSubscriptions).values({
//     endpoint: sub.endpoint,
//     p256dh: sub.keys.p256dh,
//     auth: sub.keys.auth,
//   });

//   return c.json({ ok: true });
// });

export default notifRouter;
