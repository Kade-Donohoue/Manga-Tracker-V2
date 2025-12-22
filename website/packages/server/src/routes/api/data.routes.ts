import { createDb } from '@/db';
import { user } from '@/db/schema';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';
import pullRouter from './data/pull.routes';
import updateRouter from './data/update.routes';
import addRouter from './data/add.router';
import removeRouter from './data/remove.router';

const dataRouter = createRouter();

dataRouter.use('*', requireAuth);

const routes = [
  { route: '/add', router: addRouter },
  { route: '/pull', router: pullRouter },
  { route: '/remove', router: removeRouter },
  { route: '/update', router: updateRouter },
] as const;

routes.forEach(({ route, router: child }) => {
  dataRouter.route(route, child);
});

export default dataRouter;
