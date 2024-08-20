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
    
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
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
        
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 25*1000})
        await job.updateProgress(20)

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

        await job.updateProgress(40)

        var resizedImage:Buffer|null = null
        if (icon) {
            const overViewURL = await page.evaluate(() => `${(window as any).__NUXT__.config.public.baseUrl}${document.querySelector("div.reader--menu > div > div > a.text-primary")?.getAttribute('href')}`, {timeout: 500})
            if (config.logging.verboseLogging) console.log(overViewURL)
            await page.goto(overViewURL)
            await job.updateProgress(60)
            
            const photoSelect = await page.waitForSelector('img.rounded', {timeout:1000}) // issue

            const photo = (await photoSelect?.evaluate(el => el.getAttribute('src'))).replace('https://', 'https://uploads.').replace('.512.jpg', '')
            if (config.logging.verboseLogging) console.log(photo)

            const icon = await page.goto(photo)
            await job.updateProgress(80)
            console.log(icon)
            let iconBuffer = await icon?.buffer()
            console.log(iconBuffer)
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await page.close()

        await job.updateProgress(90)
        
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
        
        //ensure only custom error messages gets sent to user
        if (err.message.startsWith('Manga:')) throw new Error(err.message)
        throw new Error('Unable to fetch Data! maybe invalid Url?')
    }
}
