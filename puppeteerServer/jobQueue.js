const Queue = require('bull')

const getQueue = new Queue('Get Manga Queue', {
    redis: {
        port: 6379,
        host: "127.0.0.1"
    }
})

const updateQueue = new Queue('Update Manga Queue', {
    redis: {
        port: 6379,
        host: "127.0.0.1"
    }
})

module.exports = {
    getQueue,
    updateQueue
}