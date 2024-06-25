const {getQueue} = require('./jobQueue')
const manganato = require('./mangaNato/getManga')
const reaperScansFake = require('./reaper-scans/getManga')
const config = require('./config.json')

getQueue.process(async (job, done) => {
    console.log("starting job")
    // console.log(job.data)
    var data
    switch(job.data.type) {
        case 'manganato':
            data = await manganato.getMangaFull(job.data.url, job.data.getIcon)
            break
        case 'reaper': 
            done(new Error('Not Implemented! please disable in config'))
            break
        case 'reaper-scans-fake':
            data = await reaperScansFake.getMangaFull(job.data.url, job.data.getIcon)
            break
        default:
                console.log('Unknown get manga job')
    }
    if (job.data.update) {

    }  if (data != -1) {
        done(null, data)
    } else {
        done(new Error('internal error fetching manga'))
    }
})

var currentResults = []
getQueue.on('completed', async (job, result) => {
    // console.log(`Job completed with result`);
    // console.log(job)
    if (job.data.update) {
        currentResults.push({...result,...{"mangaId": job.data.mangaId}})
        if (job.data.length == currentResults.length) {
            // console.log(currentResults)
            const resp = await fetch(`${config.serverUrl}/api/data/update/bulkUpdateMangaInfo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "newData": currentResults
                }),
            })
            // console.log((await resp.json()).metrics[0].meta)
            currentResults = []
        }
    }
})

// console.log(getQueue.getQueue)