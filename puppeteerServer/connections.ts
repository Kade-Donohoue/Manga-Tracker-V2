import { ConnectionOptions } from 'bullmq';
import config from './config.json';

export const connection: ConnectionOptions = {
  host: config.queue.redisIp,
  port: 6379,
};
