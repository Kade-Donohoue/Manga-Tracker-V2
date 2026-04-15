// import { ConnectionOptions } from 'bullmq';
import config from './config.json';

// export const connection: ConnectionOptions = {
//   host: config.queue.redisIp,
//   port: 6379,
// };

import IORedis from 'ioredis';

export const connection = new IORedis({
  host: config.queue.redisIp,
  port: 6379,

  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  connectionName: 'bullmq:shared',
});
