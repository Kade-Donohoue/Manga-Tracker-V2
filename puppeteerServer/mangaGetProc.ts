import { Job } from 'bullmq'

import config from './config.json'
import {getManga as getManganato} from './puppeteerScripts/mangaNato'
import {getManga as getFakeReaper} from './puppeteerScripts/reaper-scans'
import {getManga as getAsura} from './puppeteerScripts/asuraV3'
import {getManga as getMangadex} from './puppeteerScripts/mangadex'
import {getManga as getReaperScans} from './puppeteerScripts/reaperScans'

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
        default:
            console.log('Unknown get manga job: ' + job.data.type)
            throw new Error('Invalid Job Type!')
    }
}