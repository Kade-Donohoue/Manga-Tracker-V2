import { Job } from 'bullmq'

import config from './config.json'
import {getManga as getManganato} from './puppeteerScripts/mangaNato'
import {getManga as getFakeReaper} from './puppeteerScripts/reaper-scans'
import {getManga as getAsura} from './puppeteerScripts/asuraV3'
import {getManga as getMangadex} from './puppeteerScripts/mangadex'
import {getManga as getReaperScans} from './puppeteerScripts/reaperScans'
import { getManga as getComick } from './puppeteerScripts/comick'

let lastComickJobTimestamp = 0; // Timestamp of the last 'comick' job processed
const RATE_LIMIT_INTERVAL = 5000; // 1000ms = 1 second

export default async function (job:Job) {
    if (config.logging.verboseLogging) console.log("starting job \n" + job.data)
    switch(job.data.type) {
        case 'manganato':
            return await getManganato(job.data.url, job.data.getIcon, job.data.update, job)
        case 'mangadex':
            return await getMangadex(job.data.url, job.data.getIcon, job.data.update, job)
        case 'reaper-scans-fake':
            return await getFakeReaper(job.data.url, job.data.getIcon, job.data.update, job)
        case 'asura': 
            return await getAsura(job.data.url, job.data.getIcon, job.data.update, job)
        case 'reaperScans':
            return await getReaperScans(job.data.url, job.data.getIcon, job.data.update, job)
        case 'comick':
            const currentTimestamp = Date.now();
            
            // Check if the last 'comick' job was processed less than 1 second ago
            const timeElapsed = currentTimestamp - lastComickJobTimestamp;
            if (timeElapsed < RATE_LIMIT_INTERVAL) {
            // If it's too soon, wait until the rate limit period has passed
            const delay = RATE_LIMIT_INTERVAL - timeElapsed;
            console.log(`Rate limit hit. Waiting for ${delay}ms before processing the next 'comick' job.`);
            await new Promise(resolve => setTimeout(resolve, delay)); // Delay execution
            }
            
            // Now process the 'comick' job
            lastComickJobTimestamp = Date.now(); //
            return await getComick(job.data.url, job.data.getIcon, job.data.update, job)
        default:
            console.log('Unknown get manga job: ' + job.data.type)
            throw new Error('Invalid Job Type!')
    }
}