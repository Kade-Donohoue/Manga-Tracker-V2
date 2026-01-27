import { createAuth } from '@/lib/auth';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';
import { User } from 'better-auth';

const userRouter = createRouter();

userRouter.use('*', requireAuth);

userRouter.post('/avatar', async (c) => {
  // const auth = createAuth(c.env);
  const currentUser: User = c.get('user');

  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return new Response('Invalid file', { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return new Response('Only images allowed', { status: 400 });
  }

  const key = `avatars/${currentUser.id}.png`;

  await c.env.IMG.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  const url = `${c.env.VITE_IMG_URL}/${key}?v=${Date.now()}`;

  //Gives 401 for some reason. returning to user to have them update
  // await auth.api.updateUser({ body: { image: url },  });

  return Response.json({ url });
});

export default userRouter;
