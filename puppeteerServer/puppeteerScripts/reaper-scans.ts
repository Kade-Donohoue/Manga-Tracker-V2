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
    
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    try {
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
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

        await page.goto(url, {waitUntil: 'networkidle0', timeout: 25*1000})
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

        const titleSelect = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a > span', {timeout: 5000})
        let mangaName = await titleSelect.evaluate(el => el.innerText)

        await job.updateProgress(40)

        var resizedImage = null
        var iconData = null
        if (icon) {
            const mangaURLButton = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a', {timeout: 5000})
            const mangaURL = await mangaURLButton.evaluate(el => el.getAttribute('href'))

            if (config.logging.verboseLogging) console.log("starting Icon Save")
            await page.goto(mangaURL)
            await job.updateProgress(60)

            const photo = await page.waitForSelector('div.thumb > img.wp-post-image', {timeout: 5000})
            const photoURL = await photo.evaluate(el => el.src)

            allowAllRequests = true
            const icon = await page.goto(photoURL)
            await job.updateProgress(80)
            const iconBuffer = await icon.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await job.updateProgress(90)
        await page.close()

        const currIndex = chapterUrlList.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Please retry or contact Admin!")
        }

        await job.updateProgress(100)
        return {"mangaName": mangaName, "chapterUrlList": chapterUrlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
        
    } catch (err) {
        console.warn("Unable to fetch: " + url)
        if (config.logging.verboseLogging) console.warn(err)
        await page.close()
        
        //ensure only custom error messages gets sent to user
        if (err.message.startsWith('Manga:')) throw new Error(err.message)
        throw new Error('Unable to fetch Data! maybe invalid Url?')
    }
}
