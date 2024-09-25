import {match} from '../util'
import config from '../config.json'
import sharp from 'sharp'
import { getBrowser } from '../jobQueue'
import { Job } from 'bullmq'

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
export async function getManga(url:string, icon:boolean = true, ignoreIndex = false, job:Job) {
    if (config.logging.verboseLogging) console.log('Asura')
    
    let lastTimestamp:number = Date.now()
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)

        let allowAllRequests:boolean = false
        const allowRequests = ['asura']
        const bypassAllowReqs = ['_next/static/chunks']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg', 'disqus', '.js', '.woff', '/api/']
        page.on('request', (request) => {
            if (allowAllRequests) return request.continue()
                
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
        
        job.log(logWithTimestamp('Starting Loading Chapter'))
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 10*1000})
        await job.updateProgress(20)
        job.log(logWithTimestamp('Chapter Loaded, starting retrial of overview URL and chapterData'))

        const stringData = await page.evaluate(() => {
            let foundData:string = ''
            let foundStart:boolean = false
            let str:string

            (window as any).__next_f.forEach((bigArray:any[]) => {
                if (bigArray[0] != 1) return false
                str += (bigArray[1] as any)
            })
            return str.slice(str.indexOf('\n31:'), str.indexOf('\n30:'))
        })
        await job.updateProgress(30)

        const overViewURL = await page.evaluate(() => {
            let foundData = '';
            (window as any).__next_f.some((bigArray:any[]) => {
                if (bigArray[0] != 1) return false
                let str:string = bigArray[1] as any
                if (str.indexOf('"slug":"') >= 0) {
                    foundData = `${(window as any).__ENV.NEXT_PUBLIC_FRONTEND_URL}/series/${str.slice(str.indexOf('"slug":"')+8, str.indexOf('","name":'))}/`
                } 
                return false
            })
            return foundData
        })
        await job.updateProgress(35)
        
        job.log(logWithTimestamp('Data Retried! processing Data'))
        let dataRows = stringData.trim().split('\n')

        let chapterLinks = []
        let chapterText = []
        dataRows.reverse().forEach((row) => {
            if (!row) return
            const parsedValues = JSON.parse(row.slice(row.indexOf(':')+1))
            chapterText.push(parsedValues.label)
            chapterLinks.push(overViewURL+'chapter/'+parsedValues.value)
        })
        job.log(logWithTimestamp('Chapter Data Processed'))

        if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) throw new Error('Manga: Issue fetching Chapters')

        const title = await page.evaluate(() => document.querySelector("a.items-center:nth-child(2) > h3:nth-child(1)")?.innerHTML, {timeout: 500})

        if (config.logging.verboseLogging) {
            console.log(chapterLinks)
            console.log(chapterText)
            console.log(title)
        }
        job.log(logWithTimestamp('Info Gathered'))

        await job.updateProgress(40)
        
        var resizedImage:Buffer|null = null
        if (icon) {
            job.log(logWithTimestamp('Starting Icon Fetch'))
            if (config.logging.verboseLogging) console.log(overViewURL)
            await page.goto(overViewURL, {timeout: 10000})
            job.log(logWithTimestamp('Overview Page loaded'))
                                                  
            const photoSelect = await page.waitForSelector('img.rounded', {timeout:1000}) // issue
            const photo = await photoSelect?.evaluate(el => el.getAttribute('src'))
            
            // console.log(photo)
            job.log(logWithTimestamp('Going to Photo'))
            allowAllRequests = true
            const icon = await page.goto(photo!, {timeout: 10000})
            await job.updateProgress(60)

            let iconBuffer = await icon?.buffer()
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        job.log(logWithTimestamp('Data fetched'))
        await job.updateProgress(80)
        await page.close()
        

        //match index by chapter number as asura frequently changes id in url 
        let endChapUrls = chapterLinks.map((valUrl) => valUrl.split('/chapter/').at(-1))
        const currIndex = endChapUrls.indexOf(url.split('/chapter/').at(-1))

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!')
        }
        await job.updateProgress(100)
        return {"mangaName": title, "chapterUrlList": chapterLinks.join(','), "chapterTextList": chapterText.join(','), "currentIndex": currIndex, "iconBuffer": resizedImage}
    } catch (err) {
        job.log(logWithTimestamp(`Error: ${err}`))
        console.warn(`Unable to fetch data for: ${url}`)
        if (config.logging.verboseLogging) console.warn(err)
        if (!page.isClosed()) await page.close()
        
        //ensure only custom error messages gets sent to user
        if (err.message.startsWith('Manga:')) throw new Error(err.message)
        throw new Error('Unable to fetch Data! maybe invalid Url?')
    }

    function logWithTimestamp(message: string): string {
        const currentTimestamp = Date.now()
        let timeDiffMessage = ""
    
        if (lastTimestamp !== null) {
            const diff = currentTimestamp - lastTimestamp
            timeDiffMessage = formatTimeDifference(diff)
        }
    
        lastTimestamp = currentTimestamp;
        const timestamp = new Date(currentTimestamp).toISOString()
        return `[${timestamp}] ${message}${timeDiffMessage}`
    }
    
    function formatTimeDifference(diff: number): string {
        if (diff >= 60000) {
            const minutes = (diff / 60000).toFixed(2)
            return ` (Took ${minutes} min)`
        } else if (diff >= 1000) {
            const seconds = (diff / 1000).toFixed(2)
            return ` (Took ${seconds} sec)`
        } else {
            return ` (Took ${diff} ms)`
        }
    }
}