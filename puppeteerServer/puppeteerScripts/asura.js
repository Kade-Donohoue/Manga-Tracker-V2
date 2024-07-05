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
async function getManga(url, icon = true) {
    // if (!config.allowManganatoScans) return -2
    
    const browser = await puppeteer.launch({headless: "new", devtools: false, ignoreHTTPSErrors: true, //"new"
            args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
        page.setRequestInterception(true)

        const allowRequests = ['asura']
        const bypassAllowReqs = ['jquery.min.js', 'function.js']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg', 'disqus', '.js']
        page.on('request', (request) => {
            const u = request.url()
            if (!utils.match(u, allowRequests)) {
                request.abort()
                return
            }

            if (utils.match(u, bypassAllowReqs)) {
                request.continue()
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

        // await new Promise((resolve) => {setTimeout(resolve, 10*60*1000)}) // 10 min delay for testing

        const titleSelect = await page.waitForSelector('::-p-xpath(/html/body/div[5]/div/div/div/article/div[1]/div/a)') //Gets element that has title and overview page URL
        const mangaName = await titleSelect.evaluate(el => el.innerText)
        const mangaURL = await titleSelect.evaluate(el => el.getAttribute('href'))

        await page.goto(mangaURL) 

        const chapData = await page.evaluate((selector) => {
            const listElements = document.querySelectorAll(selector)
        
            let chapterUrlList = []
            let chapterTextList = []
            listElements.forEach(item => {
                chapterUrlList.push(item.querySelector('a').href)
                try {
                    chapterTextList.push("Chapter " + item.getAttribute('data-num').match(/[0-9.]+/g)[0])
                } catch {
                    chapterTextList.push(item.getAttribute('data-num'))
                }
            })

            return [chapterUrlList, chapterTextList]
        }, "#chapterlist > ul > li")

        let chapterUrlList = []
        chapData[0].forEach((chap) => { // flips list and removes duplicates
            if (!chap.includes('asura') || chapterUrlList.includes(chap)) return
            chapterUrlList.splice(0,0,chap)
        })

        let chapterTextList = []
        chapData[1].forEach((chap) => { // flips list and removes duplicates
            if (chap.includes('Select Chapter') || chapterTextList.includes(chap)) return
            chapterTextList.splice(0,0,chap)
        })


        var resizedImage = null
        var iconBuffer = null
        if (icon) {
            const photoSelect = await page.waitForSelector('.thumb > img:nth-child(1)')
            const iconPage = await browser.newPage()

            const blockRequestsImg = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.svg', 'disqus', ]
            iconPage.on('request', (request) => {
                const u = request.url()
    
                if (utils.match(u, blockRequestsImg)) {
                    request.abort()
                    return
                }
                request.continue()
            })

            const photo = await photoSelect.evaluate(el => el.getAttribute('src'))
            // console.log(photo)
            
            const icon = await iconPage.goto(photo)
            iconBuffer = await icon.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await browser.close()
        
        const currIndex = chapterUrlList.indexOf(url)

        if (currIndex == -1) {
            return "unable to find current chapter. Please retry or contact Admin!"
        }

        return {"mangaName": mangaName, "chapterUrlList": chapterUrlList.join(','), "chapterTextList": chapterTextList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage/*iconData*/}
    } catch (err) {
        console.warn(err)
        await browser.close()
        return null
    }
}

module.exports = {
    getManga
}