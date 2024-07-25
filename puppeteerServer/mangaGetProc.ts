import { getQueue } from './jobQueue'
import {getManga as getManganato} from './puppeteerScripts/mangaNato'
import {getManga as getFakeReaper} from './puppeteerScripts/reaper-scans'
import {getManga as getAsura} from './puppeteerScripts/asuraV2'
import config from './config.json'
import {fetchData} from './types'

getQueue.process(async (job, done) => {
    if (config.verboseLogging) console.log("starting job \n" + job.data)
    var data
    switch(job.data.type) {
        case 'manganato':
            data = await getManganato(job.data.url, job.data.getIcon)
            break
        case 'reaper': 
            done(new Error('Not Implemented! please disable in config'))
            break
        case 'reaper-scans-fake':
            data = await getFakeReaper(job.data.url, job.data.getIcon)
            break
        case 'asura': 
            data = await getAsura(job.data.url, job.data.getIcon)
            break
        default:
                data = 'Invalid Job Type'
                console.log('Unknown get manga job')
    }
    if (job.data.update) {

    }  if (data != -1) {
        done(null, data)
    } else {
        done(new Error('internal error fetching manga'))
    }
})

let count:number = 0;
let currentResults:{"mangaName":string, "chapterUrlList":string, "chapterTextList":string, "currentIndex":number, "iconBuffer":Buffer, mangaId:string}[] = []
getQueue.on('completed', async (job, result) => {
    if (config.verboseLogging) console.log(`Job completed with result: \n ${job}`);
    if (job.data.update) {
        count++
        if (result instanceof Object) currentResults.push({...result,...{"mangaId": job.data.mangaId}})
        if (config.verboseLogging) console.log(`${count} / ${job.data.length}`)
        if (count >= job.data.length) {
            if (config.verboseLogging) console.log(currentResults)
            const resp = await fetch(`${config.serverUrl}/api/data/update/bulkUpdateMangaInfo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": config.serverPassWord,
                    "newData": currentResults
                }),
            })
            if (!resp.ok) console.warn(await resp.json())
            if (config.verboseLogging) console.log('Manga Update Saved!')
            currentResults = []
            count = 0
        }
    }
})

// getQueue.on("waiting", (jobId) => {
//     console.log(jobId)
// })

// console.log(getQueue.getQueue)