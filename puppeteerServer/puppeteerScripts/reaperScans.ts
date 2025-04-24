import {match} from '../util'
import config from '../config.json'
import sharp from 'sharp'
import { getBrowser } from "../jobQueue"
import { Job } from 'bullmq'
import { fetchData } from '../types'

/**
 * Gets the chapter list from ChapManganato
 * @param url: Chapter URL of a manga from ChapManganato. 
 * @param icon: wether or not to get icon
 * @returns {
 *  "mangaName": name of manga , 
 *  "urlList": string separated by commas(',') for all chapter urls of manga
 *  "chapterTextList": string separated by commas(',') for all chapter text of manga
 *  "iconBuffer": base64 icon for manga
 * }
 */
export async function getManga(url:string, icon:boolean = true, ignoreIndex = false, job:Job):Promise<fetchData> {
    if (config.logging.verboseLogging) console.log('ReaperScans')
    
    let lastTimestamp:number = Date.now()
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)

        let allowAllRequests:boolean = false
        const allowRequests = ['reaperscans.com']
        const bypassAllowReqs = ['jquery.min.js', 'function.js', 'webpack', 'rocket']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg', 'disqus', '.js', '.ico']
        page.on('request', (request) => {
            if (allowAllRequests) return request.continue()

            const u = request.url()
            if (!match(u, allowRequests)) {
                request.abort()
                return
            }

            if (match(u, bypassAllowReqs)) {
                request.continue()
                return
            }

            if (request.resourceType() == "image") { 
                request.abort()
                return
            }

            if (match(u, blockRequests)) {
                request.abort()
                return
            }
            request.continue()
        })
        
        job.log(logWithTimestamp('Loading Chapter Page'))
        await page.goto(url, {waitUntil: 'load', timeout: 10*1000})
        job.log(logWithTimestamp('Chapter Page Loaded. Starting Data Collection'))
        await job.updateProgress(20)

        let seriesSlug = url.replace('//', '').split('/')[2]
        if(config.logging.verboseLogging) console.log(seriesSlug)

        job.log(logWithTimestamp('Starting Chapter Request'))
        let chapResponse = await fetch(`https://api.reaperscans.com/chapters/${seriesSlug}/all`)
        if(config.logging.verboseLogging) console.log(chapResponse)
        job.log(logWithTimestamp('Fetch Complete'))

        if (!chapResponse.ok) throw new Error('Manga: Unable to get Chapter List. Contact an admin or try again later!')

        let chapterSlugs:string[] = []
        let chapterText:string[] = []
        for (const chapData of (await chapResponse.json())) {
            // filters out early releases
            if (!chapData.public) continue

            chapterSlugs.push(chapData.chapter_slug)
            chapterText.push(chapData.chapter_slug.split('-')[1])
        }
        chapterSlugs.reverse()
        chapterText.reverse()


        if (chapterSlugs.length == 0 || chapterSlugs.length != chapterText.length) throw new Error('Manga: Issue fetching Chapters')

        const title = await page.evaluate(() => document.querySelector("h2.font-semibold")?.innerHTML, {timeout: 500})

        if (config.logging.verboseLogging) {
            console.log(chapterSlugs)
            console.log(chapterText)
            console.log(title)
        }

        job.log(logWithTimestamp('Data Collected'))
        await job.updateProgress(40)
        
        var resizedImage:Buffer|null = null
        if (icon) {

            const photoSelect = await page.waitForSelector('img.rounded', {timeout:1000})
            const photo = (await photoSelect?.evaluate(el => el.getAttribute('src'))).replace('w=96', 'w=384')
            if (config.logging.verboseLogging) console.log(`https://reaperscans.com${photo}`)
            
            allowAllRequests = true
            job.log(logWithTimestamp('Loading Cover Image'))
            const icon = await page.goto(`https://reaperscans.com${photo!}`, {timeout: 10000})
            await job.updateProgress(75)
            job.log(logWithTimestamp('Cover Image Loaded'))

            let iconBuffer = await icon?.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await job.updateProgress(90)
        await page.close()
        job.log(logWithTimestamp('All Data Fetched Processing'))
        
        if (config.logging.verboseLogging) console.log(url.replace(`https://reaperscans.com/series/${seriesSlug}/`, ''))
        const currIndex = chapterSlugs.indexOf(url.replace(`https://reaperscans.com/series/${seriesSlug}/`, ''))

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Try opening page and copying URL or contact an Admin!")
        }

        job.log(logWithTimestamp('Done'))
        await job.updateProgress(100)
        return {
            "mangaName": title, 
            "urlBase": `https://reaperscans.com/series/${seriesSlug}/`,
            "slugList": chapterSlugs.join(','), 
            "chapterTextList": chapterText.join(','), 
            "currentIndex": currIndex, 
            "iconBuffer": resizedImage
        }
    } catch (err) {
        job.log(logWithTimestamp(`Error: ${err}`))
        console.warn(`Unable to fetch data for: ${url}`)
        if (config.logging.verboseLogging) console.warn(err)
        if (!page.isClosed()) await page.close()
        if (err.name === 'TimeoutError') {
            throw new Error("Exceeded Timeout please try again later!")
        }

        //ensure only custom error messages gets sent to user
        if (err.message.startsWith('Manga:')) throw new Error(err.message)
        throw new Error('Unable to fetch Data! maybe invalid Url?')
    }

    function logWithTimestamp(message: string): string {
        const currentTimestamp = Date.now();
        let timeDiffMessage = "";
    
        if (lastTimestamp !== null) {
            const diff = currentTimestamp - lastTimestamp;
            timeDiffMessage = formatTimeDifference(diff);
        }
    
        lastTimestamp = currentTimestamp;
        const timestamp = new Date(currentTimestamp).toISOString();
        return `[${timestamp}] ${message}${timeDiffMessage}`;
    }
    
    function formatTimeDifference(diff: number): string {
        if (diff >= 60000) {
            const minutes = (diff / 60000).toFixed(2);
            return ` (Took ${minutes} min)`;
        } else if (diff >= 1000) {
            const seconds = (diff / 1000).toFixed(2);
            return ` (Took ${seconds} sec)`;
        } else {
            return ` (Took ${diff} ms)`;
        }
    }
}