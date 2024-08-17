// const config = require('../../../../data/config.json')
const puppeteer = require("puppeteer-extra")
const {match} = require('../util')
const config = require('../config.json')
const stealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(stealthPlugin())
const sharp = require('sharp')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
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
*  "chapterUrlList": string separated by commas(',') for all chapter urls of manga
*  "chapterTextList": string separated by commas(',') for all chapter text of manga
*  "iconBuffer": base64 icon for manga
*  }
 */

export async function getManga(url:string, icon:boolean = true, ignoreIndex = false) {
    // if (!config.allowReaperScansFake) return -2
    // console.log(`opening: ${url}`)
    const browser = await puppeteer.launch({headless: true, devtools: false, ignoreHTTPSErrors: true, //"new"
            args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
        page.setRequestInterception(true)

        const allowRequests = ['reaper-scans']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg']
        page.on('request', (request) => {
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
        page.viewport({width: 960, height: 1040})

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
            chapterUrlList.splice(0,0,chap)
        })

        let chapterTextList:string[] = []
        chapterText.forEach((chap:string) => {
            if (chap.includes('Select Chapter') || chapterTextList.includes(chap)) return
            chapterTextList.splice(0,0,chap)
        })

        if (chapterUrlList.length <= 0 || chapterTextList.length != chapterUrlList.length) return 'Issue fetching Chapters Contact an Admin!'

        const titleSelect = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a > span', {timeout: 5000})
        let mangaName = await titleSelect.evaluate(el => el.innerText)

        const mangaURLButton = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a', {timeout: 5000})
        const mangaURL = await mangaURLButton.evaluate(el => el.getAttribute('href'))

        var resizedImage = null
        var iconData = null
        if (icon) {
            if (config.verboseLogging) console.log("starting Icon Save")
            const photoPage = await browser.newPage()
            photoPage.setDefaultNavigationTimeout(15000)
            photoPage.setRequestInterception(true)

            const blockRequests = ['.css', '.js', 'facebook', '.png', 'google', 'fonts']
            photoPage.on('request', (request) => {
                const u = request.url()
                if (match(u, blockRequests)) {
                    request.abort()
                    return
                } 
            request.continue()
            })

            await photoPage.goto(mangaURL)
            photoPage.viewport({width: 960, height: 1040})
            const photo = await photoPage.waitForSelector('div.thumb > img.wp-post-image', {timeout: 5000})
            const photoURL = await photo.evaluate(el => el.src)
            const icon = await photoPage.goto(photoURL)

            const iconBuffer = await icon.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }

        await browser.close()

        const currIndex = chapterUrlList.indexOf(url)

        if (currIndex == -1 && !ignoreIndex) {
            return "unable to find current chapter. Please retry or contact Admin!"
        }

        return {"mangaName": mangaName, "chapterUrlList": chapterUrlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
        
    } catch (err) {
        console.warn("Unable to fetch: " + url)
        if (config.verboseLogging) console.warn(err)
        await browser.close()
        return 'Unable to fetch Data! maybe invalid Url?'
    }
}
