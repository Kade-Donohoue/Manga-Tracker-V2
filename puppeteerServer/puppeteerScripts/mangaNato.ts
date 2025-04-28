import config from '../config.json'
import {match} from '../util'
import sharp from 'sharp'
import { getBrowser } from "../jobQueue"
import { Job } from 'bullmq'
import { fetchData } from '../types'

/**
 * Gets the chapter list from ChapManganato
 * Currently BROKEN DUE TO MANGANATO DOMAIN CHANGE / UNTESTED WITH NEW DOMAIN!!!!!!!!!
 * @param url: Chapter URL of a manga from ChapManganato. 
 * @param icon: wether or not to get icon
 * @returns {
 *  "mangaName": name of manga , 
 *  "urlList": string separated by commas(',') for all chapter urls of manga
 *  "chapterTextList": string separated by commas(',') for all chapter text of manga
 *  "iconBuffer": base64 icon for manga
 * }
 */
export async function getManga(url:string, icon:boolean = true, ignoreIndex = false, job:Job):Promise<fetchData> {
    // throw new Error('Manga: MANGANATO CURRENTLY DISABLED!')
    
    let lastTimestamp:number = Date.now()
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    try {
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0')
        await page.setExtraHTTPHeaders({'accept-language': 'en-US,en;q=0.9'})

        let allowAllRequests:boolean = false
        const allowRequests = ['manganato']
        const forceAllow = ['404_not_found.png']
        const blockRequests = ['.css', '.js', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.jpg', '.svg', '.webp']
        page.on('request', (request) => {

            if (allowAllRequests) {
                request.continue()
                return
            }

            const u = request.url()

            if (match(u, forceAllow)) {
                request.continue()
                return
            }

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

        job.log(logWithTimestamp('Loading Chapter Page'))
        await page.goto(url, {waitUntil: 'load', timeout: 10*1000})
        await job.updateProgress(20)
        job.log(logWithTimestamp('Chapter Page Loaded. Fetching Data'))

        const chapterDropdown = await page.waitForSelector('.navi-change-chapter', {timeout: 500})

        const titleSelect = await page.waitForSelector('div.breadcrumb:nth-child(3) > p:nth-child(1) > span:nth-child(3) > a:nth-child(1)')
        const mangaName = await titleSelect?.evaluate(el => el.innerText)
        const overviewUrl = await titleSelect?.evaluate(el => el.getAttribute('href'))

        // Extract the text values
        const urlList = chapterDropdown
            ? (await chapterDropdown.evaluate(select =>
                Array.from(select.querySelectorAll('option')).map(option =>
                    option.getAttribute('data-c').split('chapter-').at(-1)
                )
                )).reverse()
            : [];


        
        if (urlList.length <= 0) throw new Error('Manga: Issue fetching chapters! Please Contact and Admin!')

        job.log(logWithTimestamp('Chapter Data Fetched'))
        await job.updateProgress(40)

        var resizedImage:Buffer|null = null
        // var iconBuffer:Buffer|null|undefined = null
        if (icon) {
            job.log(logWithTimestamp('Loading Overview Page'))
            await page.setJavaScriptEnabled(false)
            allowAllRequests = true

            await page.goto(overviewUrl)

            await page.evaluate(() => {
                const images = document.querySelectorAll('img')
                images.forEach(img => img.onerror = null)
            })

            job.log(logWithTimestamp('Overview page loaded'))
            await job.updateProgress(50)

            const photoElement = await page.waitForSelector('div.manga-info-top > div.manga-info-pic > img')

            const photoUrl = await photoElement?.evaluate(el => el.src)

            job.log(logWithTimestamp('Photo Page Fetched'))
            await job.updateProgress(60)

            job.log(logWithTimestamp('Loading Cover Image'))

            if (config.logging.verboseLogging) console.log(photoUrl)
            const iconBuffer = await fetch(photoUrl, 
              {
                headers: {
                    "Host": "img-r1.2xstorage.com",
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
                    // "Accept": "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Referer": "https://www.manganato.gg/",
                    "Sec-Fetch-Dest": "image",
                    "Sec-Fetch-Mode": "no-cors",
                    "Sec-Fetch-Site": "cross-site",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache",
                }
              }
            )

            if (config.logging.verboseLogging) console.log(iconBuffer)
            if (!iconBuffer.ok) throw new Error('Manga: Unable to fetch cover image contact an admin!')
            job.log(logWithTimestamp('Cover Image Loaded saving now!'))
            await job.updateProgress(80)

            resizedImage = await sharp(await iconBuffer.arrayBuffer())
                .resize(480, 720)
                .toBuffer();
        }
        await job.updateProgress(90)
        await page.close()
        job.log(logWithTimestamp('All Data Fetched processing now'))
        
        if (config.logging.verboseLogging) {
            console.log(url.split('chapter-').at(-1))
            console.log(urlList)
        }
        
        const currIndex = urlList.indexOf(url.split('chapter-').at(-1))

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: Unable to find current chapter. Please retry or contact Admin!")
        }

        job.log(logWithTimestamp('Done'))
        await job.updateProgress(100)
        return {"mangaName": mangaName, urlBase: overviewUrl+'/chapter-', slugList: urlList.join(','), "chapterTextList": urlList.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        job.log(logWithTimestamp(`Error: ${err}`))
        console.warn('Unable to fetch data for: ' + url)
        if (config.logging.verboseLogging) console.warn(err)
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