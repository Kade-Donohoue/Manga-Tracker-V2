// const config = require('../../../../data/config.json')
const puppeteer = require("puppeteer-extra")
const utils = require('../util')
const stealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(stealthPlugin())
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

async function getMangaFull(url, icon = true) {
    // if (!config.allowReaperScansFake) return -2
    // console.log(`opening: ${url}`)
    const browser = await puppeteer.launch({headless: false, devtools: false, ignoreHTTPSErrors: true, //"new"
            args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
        page.setRequestInterception(true)

        const allowRequests = ['reaper-scans']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg']
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

        await page.goto(url, {waitUntil: 'networkidle0', timeout: 25*1000})
        page.viewport({width: 960, height: 1040})

        const chapterDropdown = await page.waitForSelector('#chapter', {timeout: 5000})

        const chapterURLs = await chapterDropdown.evaluate(() => Array.from(
            document.querySelectorAll('#chapter > option'),
            a => a.getAttribute('value')
        ))

        const chapterText = await chapterDropdown.evaluate(() => Array.from(
            document.querySelectorAll('#chapter > option'),
            a => a.innerText
        ))

        let chapterUrlList = []
        chapterURLs.forEach((chap) => {
            if (!chap.includes('reaper') || chapterUrlList.includes(chap)) return
            chapterUrlList.splice(0,0,chap)
        })

        let chapterTextList = []
        chapterText.forEach((chap) => {
            if (chap.includes('Select Chapter')) return
            chapterTextList.splice(0,0,chap)
        })

        const titleSelect = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a > span', {timeout: 5000})
        let mangaName = await titleSelect.evaluate(el => el.innerText)

        const mangaURLButton = await page.waitForSelector('#content > div > div > div > div.ts-breadcrumb.bixbox > div > span:nth-child(2) > a', {timeout: 5000})
        const mangaURL = await mangaURLButton.evaluate(el => el.getAttribute('href'))

        var iconData = null
        if (icon) {
            console.log("starting Icon Save")
            const photoPage = await browser.newPage()
            photoPage.setDefaultNavigationTimeout(15000)
            photoPage.setRequestInterception(true)

            const blockRequests = ['.css', '.js', 'facebook', '.png', 'google', 'fonts']
            photoPage.on('request', (request) => {
                const u = request.url()
                if (utils.match(u, blockRequests)) {
                    request.abort()
                    return
                } 
            request.continue()
            })

            await photoPage.goto(mangaURL)
            photoPage.viewport({width: 960, height: 1040})
            const photo = await photoPage.waitForSelector('::-p-xpath(/html/body/div[1]/div[2]/div/div[2]/div[1]/article/div[1]/div[2]/div[1]/div[1]/img)', {timeout: 5000})
            const photoURL = await photo.evaluate(el => el.src)
            const icon = await photoPage.goto(photoURL)

            const iconBuffer = await icon.buffer()
            iconData = iconBuffer.toString('base64')
        }

        await browser.close()

        const currIndex = chapterUrlList.indexOf(url)

        return {"mangaName": mangaName, "chapterUrlList": chapterUrlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": iconData}
        
    } catch (err) {
        console.warn(err)
        await browser.close()
        return null
    }
}

module.exports = {
    getMangaFull
}