import puppeteer from "puppeteer-extra"
import {match} from '../util'
import config from '../config.json'
import stealthPlugin from "puppeteer-extra-plugin-stealth"
puppeteer.use(stealthPlugin())
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import sharp from 'sharp'
const adblocker = AdblockerPlugin({
  blockTrackers: true // default: false
})
puppeteer.use(adblocker)

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
export async function getManga(url:string, icon:boolean = true, ignoreIndex = false) {
    // if (!config.allowManganatoScans) return -2
    if (config.verboseLogging) console.log('mangaDex')
    
    const browser = await puppeteer.launch({headless: true, devtools: false, ignoreHTTPSErrors: true, //"new"
            args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        const page = await browser.newPage()
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
        page.setViewport({width: 960, height: 1040})

        
        // await new Promise((resolve) => {setTimeout(resolve, 5*60*1000)})

        //extracts chapter links as well as the text for each chapter
        const chapterLinks:string[] = await page.evaluate(() =>  Array.from(document.querySelectorAll('div.reader--menu > div#chapter-selector > div > div > div > ul > li > ul > li'), element => `${(window as any).__NUXT__.config.public.baseUrl}/chapter/${element.getAttribute('data-value')}`).reverse())
        const chapterText:string[] = await page.evaluate(() =>  Array.from(document.querySelectorAll('div.reader--menu > div#chapter-selector > div > div > div > ul > li > ul > li'), element => element.innerHTML).reverse())

        if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) return 'Issue fetching Chapters'

        const title = await page.evaluate(() => document.querySelector("div.reader--menu > div > div > a.text-primary ")?.innerHTML, {timeout: 500})

        if (config.verboseLogging) {
            console.log(chapterLinks)
            console.log(chapterText)
            console.log(title)
        }



        var resizedImage:Buffer|null = null
        if (icon) {
            const overViewURL = await page.evaluate(() => `${(window as any).__NUXT__.config.public.baseUrl}${document.querySelector("div.reader--menu > div > div > a.text-primary")?.getAttribute('href')}`, {timeout: 500})
            if (config.verboseLogging) console.log(overViewURL)
            await page.goto(overViewURL)
            
            const photoSelect = await page.waitForSelector('img.rounded', {timeout:1000}) // issue

            const photo = (await photoSelect?.evaluate(el => el.getAttribute('src'))).replace('https://', 'https://uploads.').replace('.512.jpg', '')
            if (config.verboseLogging) console.log(photo)
            
            const iconPage = await browser.newPage()

            const icon = await iconPage.goto(photo)
            console.log(icon)
            let iconBuffer = await icon?.buffer()
            console.log(iconBuffer)
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await browser.close()
        
        const currIndex = chapterLinks.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            return "unable to find current chapter. Please retry or contact Admin!"
        }

        return {"mangaName": title, "chapterUrlList": chapterLinks.join(','), "chapterTextList": chapterText.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        console.warn(`Unable to fetch data for: ${url}`)
        if (config.verboseLogging) console.warn(err)
        await browser.close()
        return "Unknown Error occurred"
    }
}
