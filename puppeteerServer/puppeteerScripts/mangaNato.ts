import config from '../config.json'
import {match} from '../util'
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
    
    const browser = await getBrowser()
    const page = await browser.newPage()

    // await new Promise((resolve) => {setTimeout(resolve, 10*1000)}) // 10 min delay for testing 
    
    try {
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
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

        await page.goto(url, {waitUntil: 'load', timeout: 25*1000})
        await job.updateProgress(20)

        const chapterDropdown = await page.waitForSelector('body > div.body-site > div:nth-child(1) > div.panel-navigation > select', {timeout: 500})

        const chapters = await chapterDropdown?.evaluate(() => Array.from(
            document.querySelectorAll('body > div.body-site > div:nth-child(1) > div.panel-navigation > select > option'),
            a => a.getAttribute('data-c')
        ))

        let urlArgs = url.split("/")
        urlArgs.pop()
        let mangaURL = urlArgs.join("/")

        let chapterUrlList:string[] = []
        let chapterTextList:string[] = []
        for (var i = chapters!.length-1; i >= 0; i--) {
        // for (const chap of chapters) {
            chapterUrlList.push(`${mangaURL}/chapter-${chapters![i]}`)
            chapterTextList.push(`Chapter ${chapters![i]}`)
        }

        if (chapterUrlList.length <= 0 || chapterUrlList.length != chapterTextList.length) throw new Error('Manga: Issue fetching chapters! Please Contact and Admin!')

        const titleSelect = await page.waitForSelector('body > div.body-site > div:nth-child(1) > div.panel-breadcrumb > a:nth-child(3)')
        const mangaName = await titleSelect?.evaluate(el => el.innerText)

        await job.updateProgress(40)

        var resizedImage:Buffer|null = null
        var iconBuffer:Buffer|null|undefined = null
        if (icon) {
            await page.setJavaScriptEnabled(false)
            await page.goto(mangaURL)

            await job.updateProgress(60)

            await page.evaluate(() => {
                const images = document.querySelectorAll('img')
                images.forEach(img => img.onerror = null)
            })

            await new Promise((resolve) => {setTimeout(resolve, 15*1000)}) // 10 min delay for testing 

            const photoPage = await page.waitForSelector('body > div.body-site > div.container.container-main > div.container-main-left > div.panel-story-info > div.story-info-left > span.info-image > img')
            const photo = await photoPage?.evaluate(el => el.src)

            allowAllRequests = true
            const icon = await page.goto(photo!)
            await job.updateProgress(80)
            iconBuffer = await icon?.buffer()
            resizedImage = await sharp(iconBuffer!)
                .resize(480, 720)
                .toBuffer()
        }
        await job.updateProgress(90)
        await page.close()
        
        const currIndex = chapterUrlList.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: Unable to find current chapter. Please retry or contact Admin!")
        }

        await job.updateProgress(100)
        return {"mangaName": mangaName, "chapterUrlList": chapterUrlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        console.warn('Unable to fetch data for: ' + url)
        if (config.logging.verboseLogging) console.warn(err)
        await page.close()

        //ensure only custom error messages gets sent to user
        if (err.message.startsWith('Manga:')) throw new Error(err.message)
        throw new Error('Unable to fetch Data! maybe invalid Url?')
    }
}