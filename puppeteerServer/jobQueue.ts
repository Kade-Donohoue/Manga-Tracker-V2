import { Queue, Worker } from 'bullmq'
import config from './config.json'
import puppeteer from 'puppeteer-extra'
import { Browser } from 'puppeteer'
import mangaGetProc from './mangaGetProc'

//puppeteer plugins
import stealthPlugin from "puppeteer-extra-plugin-stealth"
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
puppeteer.use(stealthPlugin())
puppeteer.use(AdblockerPlugin({blockTrackers: true}))



const connection = {host: config.queue.redisIp, port: 6379}

export const getQueue = new Queue('Get Manga Queue', {
    connection
})

export const updateQueue = new Queue('Update Manga Queue', {
    connection
})

const mainGetWorker = new Worker('Get Manga Queue', mangaGetProc, {connection, concurrency:config.queue.instances})

let browser:Browser|null = null
export async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({headless: true, devtools: false, ignoreHTTPSErrors: true, args: ['--disable-gpu, --enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
        if (config.logging.verboseLogging) console.log('Stated Puppeteer!')
    }
    return browser
}

getBrowser()//called to initiate browser to help prevent multiple being opened

//cleanup on program termination
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

//shutdown on unhandled errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', promise, 'reason:', reason);
    shutdown().then(() => process.exit(1));
});

async function shutdown() {
    console.info('Shutting Down!')
    try {
        await mainGetWorker.close()

        await getQueue.close()
        await updateQueue.close()
    
        if (browser) await browser.close() 
    } catch (error) {
        console.error(error)
        console.log('Unable to gracefully shutdown!')
        process.exit(1)
    }
    

    console.info('Shutdown Complete!')

    process.exit(0)
}