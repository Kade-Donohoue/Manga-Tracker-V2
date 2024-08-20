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
    if (config.logging.verboseLogging) console.log('ReaperScans')
    
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
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
        
        await page.goto(url, {waitUntil: 'load', timeout: 10*1000})
        await job.updateProgress(20)

        // await new Promise((resolve) => {setTimeout(resolve, 5*60*1000)})

        let seriesSlug = url.replace('//', '').split('/')[2]
        
        let chapResponse = await fetch(`https://api.reaperscans.com/chapter/all/${seriesSlug}`)

        if (!chapResponse.ok) throw new Error('Manga: Unable to get Chapter List. Contact an admin or try again later!')

        let chapterLinks:string[] = []
        let chapterText:string[] = []
        for (const chapData of (await chapResponse.json())) {
            // filters out early releases
            if (chapData.price != 0) continue

            chapterLinks.push(`https://reaperscans.com/series/${seriesSlug}/${chapData.chapter_slug}`)
            chapterText.push(chapData.chapter_name.split('-')[0].trim())
        }
        chapterLinks.reverse()
        chapterText.reverse()


        if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) throw new Error('Manga: Issue fetching Chapters')

        const title = await page.evaluate(() => document.querySelector("h2.font-semibold")?.innerHTML, {timeout: 500})

        if (config.logging.verboseLogging) {
            console.log(chapterLinks)
            console.log(chapterText)
            console.log(title)
        }

        await job.updateProgress(40)
        
        var resizedImage:Buffer|null = null
        if (icon) {
            // await new Promise((resolve) => {setTimeout(resolve, 5*60*1000)}) // 10 min delay for testing

            const photoSelect = await page.waitForSelector('img.rounded', {timeout:1000})
            const photo = (await photoSelect?.evaluate(el => el.getAttribute('src'))).replace('w=48', 'w=384')
            if (config.logging.verboseLogging) console.log(`https://reaperscans.com${photo}`)
            
            allowAllRequests = true
            const icon = await page.goto(`https://reaperscans.com${photo!}`)
            await job.updateProgress(75)

            let iconBuffer = await icon?.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await job.updateProgress(90)
        await page.close()
        
        const currIndex = chapterLinks.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Please retry or contact Admin!")
        }

        await job.updateProgress(100)
        return {"mangaName": title, "chapterUrlList": chapterLinks.join(','), "chapterTextList": chapterText.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        console.warn(`Unable to fetch data for: ${url}`)
        if (config.logging.verboseLogging) console.warn(err)
        await page.close()
        if (err.name === 'TimeoutError') {
            throw new Error("Exceeded Timeout please try again later!")
        }

        //ensure only custom error messages gets sent to user
        if (err.message.startsWith('Manga:')) throw new Error(err.message)
        throw new Error('Unable to fetch Data! maybe invalid Url?')
    }
}