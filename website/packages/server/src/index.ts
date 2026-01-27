import createApp from '@/lib/create-app';
import index from '@/routes/index.route';
import auth from '@/routes/auth/auth.index';
import ping from '@/routes/api/ping.route';
import dataRouter from '@/routes/api/data.routes';
import { router } from 'better-auth/api';
import friendsRouter from './routes/api/friends.routes';
import { Environment } from './env';
import { scheduled } from './scheduledTasks';
import adminRouter from './routes/api/admin.routes';
import userRouter from './routes/api/user.route';

const app = createApp();

const routes = [
  { route: '/api', router: index },
  { route: '/api/auth', router: auth },
  { route: '/api/ping', router: ping },
  { route: '/api/data', router: dataRouter },
  { route: '/api/friends', router: friendsRouter },
  { route: '/api/serverReq/data', router: adminRouter },
  { route: '/api/user', router: userRouter },
] as const;

routes.forEach(({ route, router }) => {
  app.route(route, router);
});

export default {
  fetch: app.fetch,
  scheduled: scheduled,
};
