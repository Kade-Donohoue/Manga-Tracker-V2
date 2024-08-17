import puppeteer from "puppeteer-extra"
import {match} from '../util'
import config from '../config.json'
// const config = require('../config.json')
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
    if (config.verboseLogging) console.log('ReaperScans')
    
    const browser = await puppeteer.launch({headless: true, devtools: false, ignoreHTTPSErrors: true, //"new"
            args: ['--enable-features=NetworkService', '--no-sandbox', '--disable-setuid-sandbox','--mute-audio']})
    try {
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(25*1000) // timeout nav after 25 sec
        page.setRequestInterception(true)

        const allowRequests = ['reaperscans.com']
        const bypassAllowReqs = ['jquery.min.js', 'function.js', 'webpack', 'rocket']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg', 'disqus', '.js', '.ico']
        page.on('request', (request) => {
            const u = request.url()
            if (!match(u, allowRequests)) {
                request.abort()
                return
            }

            if (match(u, bypassAllowReqs)) {
                request.continue()
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
        
        await page.goto(url, {waitUntil: 'load', timeout: 10*1000})
        page.setViewport({width: 960, height: 1040})

        // await new Promise((resolve) => {setTimeout(resolve, 5*60*1000)})

        let seriesSlug = url.replace('//', '').split('/')[2]
        
        let chapResponse = await fetch(`https://api.reaperscans.com/chapter/all/${seriesSlug}`)

        if (!chapResponse.ok) return 'Unable to get Chapter List'

        let chapterLinks:string[] = []
        let chapterText:string[] = []
        for (const chapData of (await chapResponse.json())) {
            // filters out early releases
            if (chapData.price != 0) continue

            chapterLinks.push(`https://reaperscans.com/series/${seriesSlug}/${chapData.chapter_slug}`)
            chapterText.push(chapData.chapter_name.split('-')[0].trim())
        }
        chapterLinks.reverse()
        chapterText.reverse()


        if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) return 'Issue fetching Chapters'

        const title = await page.evaluate(() => document.querySelector("h2.font-semibold")?.innerHTML, {timeout: 500})

        if (config.verboseLogging) {
            console.log(chapterLinks)
            console.log(chapterText)
            console.log(title)
        }
        
        var resizedImage:Buffer|null = null
        if (icon) {
            // await new Promise((resolve) => {setTimeout(resolve, 5*60*1000)}) // 10 min delay for testing

            const photoSelect = await page.waitForSelector('img.rounded', {timeout:1000})
            const iconPage = await browser.newPage()
            
            const blockRequestsImg = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.svg', 'disqus', '.js']
            iconPage.on('request', (request) => {
                const u = request.url()
    
                if (match(u, blockRequestsImg)) {
                    request.abort()
                    return
                }
                request.continue()
            })

            const photo = (await photoSelect?.evaluate(el => el.getAttribute('src'))).replace('w=48', 'w=384')
            if (config.verboseLogging) console.log(`https://reaperscans.com${photo}`)
            
            const icon = await iconPage.goto(`https://reaperscans.com${photo!}`)
            let iconBuffer = await icon?.buffer()
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
        if (err.name === 'TimeoutError') {
            return "Exceeded Timeout please try again later!"
        }
        return "Unknown Error occurred"
    }
}