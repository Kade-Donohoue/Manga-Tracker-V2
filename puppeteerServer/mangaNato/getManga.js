const puppeteer = require("puppeteer-extra")
const utils = require('../util')
const stealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(stealthPlugin())
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const sharp = require('sharp')
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
async function getMangaFull(url, icon = true) {
    // if (!config.allowManganatoScans) return -2
    
    const browser = await puppeteer.launch({headless: "new", devtools: false, ignoreHTTPSErrors: true, //"new"
            args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
        page.setRequestInterception(true)

        const allowRequests = ['manganato']
        const blockRequests = ['.css', '.js', 'facebook', 'fbcdn.net', 'bidgear']
        page.on('request', (request) => {
            const u = request.url()
            if (!utils.match(u, allowRequests)) {
                request.abort()
                return
            }

            if (request.resourceType() == "image") { 
                request.abort()
                return
            }

            if (utils.match(u, blockRequests)) {
                request.abort()
                return
            }
            request.continue()
        })

        await page.goto(url, {waitUntil: 'load', timeout: 25*1000})
        page.viewport({width: 960, height: 1040})

        const chapterDropdown = await page.waitForSelector('body > div.body-site > div:nth-child(1) > div.panel-navigation > select', {timeout: 500})

        const chapters = await chapterDropdown.evaluate(() => Array.from(
            document.querySelectorAll('body > div.body-site > div:nth-child(1) > div.panel-navigation > select > option'),
            a => a.getAttribute('data-c')
        ))

        let urlArgs = url.split("/")
        urlArgs.pop()
        let mangaURL = urlArgs.join("/")

        let chapterUrlList = []
        let chapterTextList = []
        for (var i = chapters.length-1; i >= 0; i--) {
        // for (const chap of chapters) {
            chapterUrlList.push(`${mangaURL}/chapter-${chapters[i]}`)
            chapterTextList.push(`Chapter ${chapters[i]}`)
        }

        const titleSelect = await page.waitForSelector('body > div.body-site > div:nth-child(1) > div.panel-breadcrumb > a:nth-child(3)')
        const mangaName = await titleSelect.evaluate(el => el.innerText)

        var resizedImage = null
        var iconBuffer = null
        if (icon) {
            const iconPage = await browser.newPage()

            iconPage.on('request', (request) => {
                const u = request.url()
    
                if (utils.match(u, blockRequests)) {
                    request.abort()
                    return
                }
                request.continue()
            })

            await iconPage.goto(mangaURL)

            const photoPage = await iconPage.waitForSelector('body > div.body-site > div.container.container-main > div.container-main-left > div.panel-story-info > div.story-info-left > span.info-image > img')
            const photo = await photoPage.evaluate(el => el.src)
            const icon = await iconPage.goto(photo)
            iconBuffer = await icon.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }

        await browser.close()
        
        const currIndex = chapterUrlList.indexOf(url)

        return {"mangaName": mangaName, "chapterUrlList": chapterUrlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage/*iconData*/}
    } catch (err) {
        console.warn(err)
        await browser.close()
        return null
    }
}

module.exports = {
    getMangaFull
}