const puppeteer = require("puppeteer-extra")
const utils = require('../util')
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
async function getManga(url:string, icon:boolean = true) {
    // if (!config.allowManganatoScans) return -2
    if (config.verboseLogging) console.log('Asura')
    
    const browser = await puppeteer.launch({headless: true, devtools: false, ignoreHTTPSErrors: true, //"new"
            args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)

        const allowRequests = ['asura']
        const bypassAllowReqs = ['jquery.min.js', 'function.js']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg', 'disqus']
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
        
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 10*1000})
        page.setViewport({width: 960, height: 1040})

        const dropdown = await page.waitForSelector('button.dropdown-btn', {timeout: 500})
        await dropdown?.scrollIntoView()

        const menuAvailable = await clickButton(page)

        if (!menuAvailable) return "Unable to get chapter list!"

        //prevents dropdown from being closes be click
        await page.evaluate(() => {
            const dropdownContent = document.querySelector('div.dropdown-content');
            dropdownContent?.addEventListener('click', (event) => {
              event.stopPropagation()
            })
        })

        //extracts chapter links as well as the text for each chapter
        const chapterLinks:string[] = await page.evaluate(() =>  Array.from(document.querySelectorAll('div.dropdown-content > a'), element => `${(window as any).__ENV.NEXT_PUBLIC_FRONTEND_URL}${element.getAttribute('href')}`).reverse())
        const chapterText:string[] = await page.evaluate(() =>  Array.from(document.querySelectorAll('div.dropdown-content > a > h2'), element => element.innerHTML).reverse())

        if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) return 'Issue fetching Chapters'

        const title = await page.evaluate(() => document.querySelector("a.items-center:nth-child(2) > h3:nth-child(1)")?.innerHTML, {timeout: 500})

        if (config.verboseLogging) {
            console.log(chapterLinks)
            console.log(chapterText)
            console.log(title)
        }
        
        var resizedImage:Buffer|null = null
        if (icon) {
            const overViewURL = await page.evaluate(() => `${(window as any).__ENV.NEXT_PUBLIC_FRONTEND_URL}${document.querySelector("a.items-center:nth-child(2)")?.getAttribute('href')}`, {timeout: 500})
            if (config.verboseLogging) console.log(overViewURL)
            await page.goto(overViewURL, {timeout: 10000})

            const photoSelect = await page.waitForSelector('::-p-xpath(/html/body/div[5]/div/div/div/div[1]/div/div[1]/div[1]/div[2]/div[1]/div[1]/img)')
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

            const photo = await photoSelect?.evaluate(el => el.getAttribute('src'))
            // console.log(photo)
            
            const icon = await iconPage.goto(photo!, {timeout: 10000})
            
            let iconBuffer = await icon?.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await browser.close()
        
        let currIndex = 0

        return {"mangaName": title, "chapterUrlList": chapterLinks.join(','), "chapterTextList": chapterText.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        console.warn(`Unable to fetch data for: ${url}`)
        if (config.verboseLogging) console.warn(err)
        await browser.close()
        return "Unknown Error occurred"
    }
}

async function clickButton(page) {
    for (let attempt = 0; attempt <= 4; attempt++) {
        try {
            await page.click('button.dropdown-btn')

            await page.waitForSelector('div.dropdown-content', { visible: true, timeout:500 })
            return true
        } catch (error) {
            if (config.verboseLogging) console.log('Dropdown menu did not appear retrying')
        }
    }
    return false
}

module.exports = {
    getManga
}