const Queue = require('bull')
const config = require('./config.json')

const getQueue = new Queue('Get Manga Queue', {
    redis: {
        port: 6379,
        host: config.redisIp
    }
})

const updateQueue = new Queue('Update Manga Queue', {
    redis: {
        port: 6379,
        host: config.redisIp
    }
})

module.exports = {
    getQueue,
    updateQueue
}