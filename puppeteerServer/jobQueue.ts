import Queue from 'bull'
import config from './config.json'

export const getQueue = new Queue('Get Manga Queue', {
    redis: {
        port: 6379,
        host: config.redisIp
    }
})

export const updateQueue = new Queue('Update Manga Queue', {
    redis: {
        port: 6379,
        host: config.redisIp
    }
})
