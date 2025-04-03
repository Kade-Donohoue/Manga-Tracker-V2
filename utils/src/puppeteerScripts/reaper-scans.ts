const puppeteer = require("puppeteer-extra")
const { match } = require('../util')
import config from '../../config.json'
// const config = require('../config.json')
const stealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(stealthPlugin())
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const sharp = require('sharp')
const adblocker = AdblockerPlugin({
  blockTrackers: true // default: false
})
puppeteer.use(adblocker)




/**
 * Gets the chapter list from reaper-scans
 * @param url: Chapter URL of a manga from reaper-scans. 
 * @param icon: wether or not to get icon
 * @returns {
 *  "mangaName": name of manga , 
*  "urlList": string separated by commas(',') for all chapter urls of manga
*  "chapterTextList": string separated by commas(',') for all chapter text of manga
*  "iconBuffer": base64 icon for manga
*  }
 */

export async function getManga(url:string, icon:boolean = true, ignoreIndex = true) {
    
    let lastTimestamp:number = Date.now()
    const browser = await puppeteer.launch({headless: true, devtools: false, ignoreHTTPSErrors: true, //"new"
        args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
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

        await page.goto(url, {waitUntil: 'networkidle0', timeout: 10*1000})

        const chapterDropdown = await page.waitForSelector('#chapter', {timeout: 500})

        const chapterURLs = await chapterDropdown.evaluate(() => Array.from(
            document.querySelectorAll('#chapter > option'),
            a => a.getAttribute('value')
        ))

        const chapterText = await chapterDropdown.evaluate(() => Array.from(
            document.querySelectorAll('#chapter > option'),
            a => a.innerHTML
        ))

        let urlList:string[] = []
        chapterURLs.forEach((chap:string) => {
            if (!chap.includes('reaper') || urlList.includes(chap)) return
            urlList.push(chap)
        })

        let chapterTextList:string[] = []
        chapterText.forEach((chap:string) => {
            if (chap.includes('Select Chapter') || chapterTextList.includes(chap)) return
            chapterTextList.push(chap)
        })

        urlList.reverse()
        chapterTextList.reverse()

        if (urlList.length <= 0 || chapterTextList.length != urlList.length) throw new Error('Manga: Issue fetching Chapters Contact an Admin!')

        const titleSelect = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a > span', {timeout: 1000})
        let mangaName = await titleSelect.evaluate(el => el.innerText)

        var resizedImage = null
        var iconData = null
        if (icon) {
            const mangaURLButton = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a', {timeout: 1000})
            const mangaURL = await mangaURLButton.evaluate(el => el.getAttribute('href'))

            await page.goto(mangaURL, {timeout: 10000})

            const photo = await page.waitForSelector('div.thumb > img.wp-post-image', {timeout: 1000})
            const photoURL = await photo.evaluate(el => el.src)

            allowAllRequests = true
            const icon = await page.goto(photoURL, {timeout: 10000})
            const iconBuffer = await icon.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await page.close()

        const currIndex = urlList.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Please retry or contact Admin!")
        }

        return {"mangaName": mangaName, "urlList": urlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
        
    } catch (err) {
        console.warn("Unable to fetch: " + url)
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