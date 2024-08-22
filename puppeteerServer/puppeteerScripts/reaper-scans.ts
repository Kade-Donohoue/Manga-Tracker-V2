import { getBrowser } from "../jobQueue"
import {match} from '../util'
import config from '../config.json'
import sharp from 'sharp'
import { Job } from "bullmq"



/**
 * Gets the chapter list from reaper-scans
 * @param url: Chapter URL of a manga from reaper-scans. 
 * @param icon: wether or not to get icon
 * @returns {
 *  "mangaName": name of manga , 
*  "chapterUrlList": string separated by commas(',') for all chapter urls of manga
*  "chapterTextList": string separated by commas(',') for all chapter text of manga
*  "iconBuffer": base64 icon for manga
*  }
 */

export async function getManga(url:string, icon:boolean = true, ignoreIndex = false, job:Job) {
    
    let lastTimestamp:number = Date.now()
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    try {
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)

        let allowAllRequests:boolean = false
        const allowRequests = ['reaper-scans']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg']
        page.on('request', (request) => {
            if (allowAllRequests) return request.continue()

            const u = request.url()
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
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 10*1000})
        job.log(logWithTimestamp('Chapter Page Loaded. Starting Data Collection'))
        await job.updateProgress(20)

        const chapterDropdown = await page.waitForSelector('#chapter', {timeout: 500})

        const chapterURLs = await chapterDropdown.evaluate(() => Array.from(
            document.querySelectorAll('#chapter > option'),
            a => a.getAttribute('value')
        ))

        const chapterText = await chapterDropdown.evaluate(() => Array.from(
            document.querySelectorAll('#chapter > option'),
            a => a.innerHTML
        ))

        let chapterUrlList:string[] = []
        chapterURLs.forEach((chap:string) => {
            if (!chap.includes('reaper') || chapterUrlList.includes(chap)) return
            chapterUrlList.push(chap)
        })

        let chapterTextList:string[] = []
        chapterText.forEach((chap:string) => {
            if (chap.includes('Select Chapter') || chapterTextList.includes(chap)) return
            chapterTextList.push(chap)
        })

        chapterUrlList.reverse()
        chapterTextList.reverse()

        if (chapterUrlList.length <= 0 || chapterTextList.length != chapterUrlList.length) throw new Error('Manga: Issue fetching Chapters Contact an Admin!')

        const titleSelect = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a > span', {timeout: 1000})
        let mangaName = await titleSelect.evaluate(el => el.innerText)

        job.log(logWithTimestamp('Chapter Data Fetched'))
        await job.updateProgress(40)

        var resizedImage = null
        var iconData = null
        if (icon) {
            job.log(logWithTimestamp('Starting Icon Save'))
            const mangaURLButton = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a', {timeout: 1000})
            const mangaURL = await mangaURLButton.evaluate(el => el.getAttribute('href'))

            if (config.logging.verboseLogging) console.log("starting Icon Save")
            job.log(logWithTimestamp('Loading Overview page'))
            await page.goto(mangaURL, {timeout: 10000})
            await job.updateProgress(60)
            job.log(logWithTimestamp('Overview Page Loaded'))

            const photo = await page.waitForSelector('div.thumb > img.wp-post-image', {timeout: 1000})
            const photoURL = await photo.evaluate(el => el.src)

            allowAllRequests = true
            job.log(logWithTimestamp('Loading Cover Image'))
            const icon = await page.goto(photoURL, {timeout: 10000})
            job.log(logWithTimestamp('Cover Image Loaded'))
            await job.updateProgress(80)
            const iconBuffer = await icon.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await job.updateProgress(90)
        await page.close()
        job.log(logWithTimestamp('All Data Fetched'))

        const currIndex = chapterUrlList.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Please retry or contact Admin!")
        }

        job.log(logWithTimestamp('Done'))
        await job.updateProgress(100)
        return {"mangaName": mangaName, "chapterUrlList": chapterUrlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
        
    } catch (err) {
        job.log(logWithTimestamp(`Error: ${err}`))
        console.warn("Unable to fetch: " + url)
        if (config.logging.verboseLogging) console.warn(err)
        await page.close()
        
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