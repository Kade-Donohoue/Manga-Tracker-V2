const fs = require('fs')
const puppeteer = require("puppeteer-extra")
const stealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(stealthPlugin())
const utils = require('../util')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const adblocker = AdblockerPlugin({
  blockTrackers: true // default: false
})
puppeteer.use(adblocker)
const delay = ms => new Promise(res => setTimeout(res, ms));
/**
 * Gets the chapter list from ChapManganato
 * @param url: Main page URL of a manga from ChapManganato. 
 * @returns -1 if icon saving fails. Returns 1 if the image save sucessfully. Saves photo to data/icon folder
 */
async function getMangaIcon(url) {
    const browser = await puppeteer.launch({headless: "new", devtools: false, ignoreHTTPSErrors: true, 
        args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        console.log("starting Icon Save")
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(15000)
        page.setRequestInterception(true)

        const blockRequests = ['*.css*', '*.js*', '*facebook*', '*google*', '*fonts*']
        page.on('request', (request) => {
            const u = request.url()
            if (utils.match(u, blockRequests)) {
                request.abort()
                return
            } 
        request.continue()
        })

        await page.goto(url, {waitUntil: 'load', timeout: 0})
        page.viewport({width: 960, height: 1040})

        page.goto(url)//what???
        // await delay(300000)
        const photoPage = await page.waitForSelector('body > div.body-site > div.container.container-main > div.container-main-left > div.panel-story-info > div.story-info-left > span.info-image > img', 
        {
            waitUntil: 'load',
            timeout: 3000
        })
        const photo = await photoPage.evaluate(el => el.src)
        const icon = await page.goto(photo)
        const iconBuffer = await icon.buffer()
        await browser.close()
        return iconBuffer.toString('base64')
        
    } catch (err) {
        // await browser.close()
        console.log("ICON SAVING FAIL!!!!!!!!!!!!!" + err)
        return -1
    }
}

module.exports = {
    getMangaIcon
}