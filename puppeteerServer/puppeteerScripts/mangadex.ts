import {match} from '../util'
import config from '../config.json'
import sharp from 'sharp'
import { getBrowser } from "../jobQueue"
import { Job } from 'bullmq'

/**
 * Gets the chapter list from ChapManganato
 * @param url: Chapter URL of a manga from ChapManganato. 
 * @param icon: wether or not to get icon
 * @returns {
 *  "mangaName": name of manga , 
 *  "chapterUrlList": string separated by commas(',') for all chapter urls of manga
 *  "chapterTextList": string separated by commas(',') for all chapter text of manga
 *  "iconBuffer": base64 icon for manga
 * }
 */
export async function getManga(url:string, icon:boolean = true, ignoreIndex = false, job:Job) {
    if (config.logging.verboseLogging) console.log('mangaDex')
    
    let lastTimestamp:number = Date.now()
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)

        const allowRequests = ['mangadex']
        const bypassBlockReqs = ['_nuxt', 'api.mangadex.org/manga/', 'api.mangadex.org/chapter/']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg', 'disqus', '.js', '.woff']
        page.on('request', (request) => {
            const u = request.url()
            if (!match(u, allowRequests)) {
                request.abort()
                return
            }

            if (match(u, bypassBlockReqs)) {
                request.continue()
                return
            }

            if (request.resourceType() == "image") { 
                request.abort()
                return
            }

            if (request.resourceType() == "fetch") {
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
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 10*1000})
        await job.updateProgress(20)
        job.log(logWithTimestamp('Chapter Page Loaded, fetching data'))

        //extracts chapter links as well as the text for each chapter
        const chapterLinks:string[] = await page.evaluate(() =>  Array.from(document.querySelectorAll('div.reader--menu > div#chapter-selector > div > div > div > ul > li > ul > li'), element => `${(window as any).__NUXT__.config.public.baseUrl}/chapter/${element.getAttribute('data-value')}`).reverse())
        const chapterText:string[] = await page.evaluate(() =>  Array.from(document.querySelectorAll('div.reader--menu > div#chapter-selector > div > div > div > ul > li > ul > li'), element => element.innerHTML).reverse())

        if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) throw new Error('Manga: Issue fetching Chapters')

        const title = await page.evaluate(() => document.querySelector("div.reader--menu > div > div > a.text-primary ")?.innerHTML, {timeout: 500})

        if (config.logging.verboseLogging) {
            console.log(chapterLinks)
            console.log(chapterText)
            console.log(title)
        }

        job.log(logWithTimestamp('Data fetched'))
        await job.updateProgress(40)

        var resizedImage:Buffer|null = null
        if (icon) {
            job.log(logWithTimestamp('Starting Icon Fetch'))
            const overViewURL = await page.evaluate(() => `${(window as any).__NUXT__.config.public.baseUrl}${document.querySelector("div.reader--menu > div > div > a.text-primary")?.getAttribute('href')}`, {timeout: 500})
            if (config.logging.verboseLogging) console.log(overViewURL)
            job.log(logWithTimestamp('Loading overview page'))
            await page.goto(overViewURL, {timeout: 10000})
            await job.updateProgress(60)
            job.log(logWithTimestamp('Overview page loaded'))
            
            const photoSelect = await page.waitForSelector('img.rounded', {timeout:1000})

            const photo = (await photoSelect?.evaluate(el => el.getAttribute('src'))).replace('https://', 'https://uploads.').replace('.512.jpg', '')
            if (config.logging.verboseLogging) console.log(photo)
            job.log(logWithTimestamp('Loading Icon'))
            const icon = await page.goto(photo, {timeout: 10000})
            job.log(logWithTimestamp('Icon Loaded'))
            await job.updateProgress(80)
            console.log(icon)
            let iconBuffer = await icon?.buffer()
            console.log(iconBuffer)
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await page.close()
        job.log(logWithTimestamp('All Data fetch. processing data.'))
        await job.updateProgress(90)
        // if (urlParts.length > 2) urlParts.pop()

        let urlParts = url.split('chapter/').at(-1).split('/')
        let urlNoPage = `https://mangadex.org/chapter/${urlParts[0]}`
        const currIndex = chapterLinks.indexOf(urlNoPage)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Please retry or contact Admin!")
        }

        job.log(logWithTimestamp('done'))
        await job.updateProgress(100)
        return {"mangaName": title, "chapterUrlList": chapterLinks.join(','), "chapterTextList": chapterText.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        job.log(logWithTimestamp(`Error: ${err}`))
        console.warn(`Unable to fetch data for: ${url}`)
        if (config.logging.verboseLogging) console.warn(err)
        if (!page.isClosed()) await page.close()
        
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