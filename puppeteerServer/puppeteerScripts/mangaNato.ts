import config from '../config.json'
import {match} from '../util'
import sharp from 'sharp'
import { getBrowser } from "../jobQueue"
import { Job } from 'bullmq'

/**
 * Gets the chapter list from ChapManganato
 * Currently BROKEN DUE TO MANGANATO DOMAIN CHANGE / UNTESTED WITH NEW DOMAIN!!!!!!!!!
 * @param url: Chapter URL of a manga from ChapManganato. 
 * @param icon: wether or not to get icon
 * @returns {
 *  "mangaName": name of manga , 
 *  "urlList": string separated by commas(',') for all chapter urls of manga
 *  "chapterTextList": string separated by commas(',') for all chapter text of manga
 *  "iconBuffer": base64 icon for manga
 * }
 */
export async function getManga(url:string, icon:boolean = true, ignoreIndex = false, job:Job) {
    throw new Error('Manga: MANGANATO CURRENTLY DISABLED!')
    
    let lastTimestamp:number = Date.now()
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    try {
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)

        let allowAllRequests:boolean = false
        const allowRequests = ['manganato']
        const forceAllow = ['404_not_found.png']
        const blockRequests = ['.css', '.js', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.jpg', '.svg']
        page.on('request', (request) => {

            if (allowAllRequests) {
                request.continue()
                return
            }

            const u = request.url()

            if (match(u, forceAllow)) {
                request.continue()
                return
            }

            if (!match(u, allowRequests)) {
                request.abort()
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
        await job.updateProgress(20)
        job.log(logWithTimestamp('Chapter Page Loaded. Fetching Data'))

        const chapterDropdown = await page.waitForSelector('body > div.body-site > div:nth-child(1) > div.panel-navigation > select', {timeout: 500})

        const urlList = await chapterDropdown?.evaluate(() => Array.from(
            document.querySelectorAll('body > div.body-site > div:nth-child(1) > div.panel-navigation > select > option'),
            a => `${(window as any).$navi_change_chapter_address}${a.getAttribute('data-c')}`
        ).reverse())

        const chapterTextList = await chapterDropdown?.evaluate(() => Array.from(
            document.querySelectorAll('body > div.body-site > div:nth-child(1) > div.panel-navigation > select > option'),
            a => `Chapter ${a.getAttribute('data-c')}`
        ).reverse())

        
        if (urlList.length <= 0 || urlList.length != chapterTextList.length) throw new Error('Manga: Issue fetching chapters! Please Contact and Admin!')

        const titleSelect = await page.waitForSelector('body > div.body-site > div:nth-child(1) > div.panel-breadcrumb > a:nth-child(3)')
        const mangaName = await titleSelect?.evaluate(el => el.innerText)

        job.log(logWithTimestamp('Chapter Data Fetched'))
        await job.updateProgress(40)

        var resizedImage:Buffer|null = null
        var iconBuffer:Buffer|null|undefined = null
        if (icon) {
            job.log(logWithTimestamp('Loading Overview Page'))
            await page.setJavaScriptEnabled(false)
            await page.goto(await titleSelect?.evaluate(el => el.getAttribute('href')), {timeout: 10000})

            job.log(logWithTimestamp('Overview page loaded'))
            await job.updateProgress(60)

            await page.evaluate(() => {
                const images = document.querySelectorAll('img')
                images.forEach(img => img.onerror = null)
            })

            const photoPage = await page.waitForSelector('body > div.body-site > div.container.container-main > div.container-main-left > div.panel-story-info > div.story-info-left > span.info-image > img')
            const photo = await photoPage?.evaluate(el => el.src)

            job.log(logWithTimestamp('Loading Cover Image'))
            allowAllRequests = true
            const icon = await page.goto(photo!, {timeout: 10000})
            job.log(logWithTimestamp('Cover Image Loaded saving now!'))
            await job.updateProgress(80)

            iconBuffer = await icon?.buffer()
            resizedImage = await sharp(iconBuffer!)
                .resize(480, 720)
                .toBuffer()
        }
        await job.updateProgress(90)
        await page.close()
        job.log(logWithTimestamp('All Data Fetched processing now'))
        
        const currIndex = urlList.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: Unable to find current chapter. Please retry or contact Admin!")
        }

        job.log(logWithTimestamp('Done'))
        await job.updateProgress(100)
        return {"mangaName": mangaName, "urlList": urlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        job.log(logWithTimestamp(`Error: ${err}`))
        console.warn('Unable to fetch data for: ' + url)
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