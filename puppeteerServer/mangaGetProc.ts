import { getQueue } from './jobQueue'
import {getManga as getManganato} from './puppeteerScripts/mangaNato'
import {getManga as getFakeReaper} from './puppeteerScripts/reaper-scans'
import {getManga as getAsura} from './puppeteerScripts/asuraV2'
import { getManga as getMangadex } from './puppeteerScripts/mangadex'
import { getManga as getReaperScans } from './puppeteerScripts/reaperScans'
import config from './config.json'
import {fetchData} from './types'

getQueue.process(async (job, done) => {
    if (config.verboseLogging) console.log("starting job \n" + job.data)
    var data
    switch(job.data.type) {
        case 'manganato':
            data = await getManganato(job.data.url, job.data.getIcon, job.data.update)
            break
        case 'mangadex':
            data = await getMangadex(job.data.url, job.data.getIcon, job.data.update)
            break
        case 'reaper-scans-fake':
            data = await getFakeReaper(job.data.url, job.data.getIcon, job.data.update)
            break
        case 'asura': 
            data = await getAsura(job.data.url, job.data.getIcon, job.data.update)
            break
        case 'reaperScans':
            data = await getReaperScans(job.data.url, job.data.getIcon, job.data.update)
            break
        default:
                data = 'Invalid Job Type'
                console.log('Unknown get manga job: ' + job.data.type)
    }
    if (job.data.update) {

    }  if (data != -1) {
        done(null, data)
    } else {
        done(new Error('internal error fetching manga'))
    }
})


let count:number = 0 //used to keep track of how many update manga have been processed
let newChapCount:number = 0 //used to track how many new chapters
let currentResults:{"mangaName":string, "chapterUrlList":string, "chapterTextList":string, "currentIndex":number, "iconBuffer":Buffer, mangaId:string}[] = []
getQueue.on('completed', async (job, result) => {
    if (config.verboseLogging) console.log(`Job completed with result: \n ${job}`);
    if (job.data.update) {
        count++

        //test if new data is not an error than comparing odl URL list with new if different add save new list
        if (config.verboseLogging) console.log(`Not error: ${result instanceof Object}, new data: ${result.chapterUrlList != job.data.oldUrlList}`)
        if ((result instanceof Object) && (result.chapterUrlList != job.data.oldUrlList)) {
            newChapCount+=((result.chapterUrlList.match(/,/g) || []).length - (job.data.oldUrlList.match(/,/g) || []).length)
            currentResults.push({...result,...{"mangaId": job.data.mangaId}})
        } else if (config.verboseLogging) {
            console.log(result)
            console.log(`No new chapters for '${job.data.mangaId}'`)
        }
        
        
        if (config.verboseLogging) console.log(`${count} / ${job.data.length}`)
        if (count >= job.data.length && currentResults.length > 0) {
            if (config.verboseLogging) console.log(currentResults)
            if (config.verboseLogging) console.log(`Saving new data for ${currentResults.length}/${count} Chapters!`)
            console.log(newChapCount)
            const resp = await fetch(`${config.serverUrl}/api/data/update/bulkUpdateMangaInfo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": config.serverPassWord,
                    "newData": currentResults,
                    "amountNewChapters": newChapCount
                }),
            })
            if (!resp.ok) console.warn(await resp.json())
            if (config.verboseLogging) console.log('Manga Update Saved!')
            currentResults = []
            count = 0
            newChapCount = 0
        }
    }
})

// getQueue.on("waiting", (jobId) => {
//     console.log(jobId)
// })

// console.log(getQueue.getQueue)