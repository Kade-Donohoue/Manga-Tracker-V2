import {match} from '../util'
import config from '../config.json'
import sharp from 'sharp'
import { getBrowser } from "../jobQueue"
import { Job } from 'bullmq'

/**
 * Gets the chapter list from Comick
 * @param url: Chapter URL of a manga from Comick. 
 * @param icon: wether or not to get icon
 * @returns {
*  "mangaName": name of manga , 
*  "chapterUrlList": string separated by commas(',') for all chapter urls of manga
*  "chapterTextList": string separated by commas(',') for all chapter text of manga
*  "iconBuffer": base64 icon for manga
* }
*/
export async function getManga(url:string, icon:boolean = true, ignoreIndex = false, job:Job) {
    if (config.logging.verboseLogging) console.log('comick')
    
    let lastTimestamp:number = Date.now()
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
        page.setDefaultNavigationTimeout(1000) // timeout nav after 1 sec
        page.setRequestInterception(true)

        const allowRequests = ['comick']
        const bypassBlockReqs = ['_next', 'comick.pictures']
        const blockRequests = ['.css', 'facebook', 'fbcdn.net', 'bidgear', '.png', '.svg', 'disqus', '.js', '.woff']
        page.on('request', (request) => {
            const u = request.url()
            if (!match(u, allowRequests)) {
                request.abort()
                return
            }

            if (match(u, bypassBlockReqs)) {
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

        job.log(logWithTimestamp('Loading Chapter Page'))
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 10*1000})
        await job.updateProgress(20)
        job.log(logWithTimestamp('Chapter Page Loaded, fetching data'))

        
        const malJson = await page.evaluate(() => {
            const scriptContent = document.getElementById('__MALSYNC__')?.textContent;
            return scriptContent ? JSON.parse(scriptContent) : null;
        });
        await job.updateProgress(30)
        job.log(logWithTimestamp('Mal Data fetched'))
    

        const chapterLinks:string[] = await page.evaluate((malJson) =>  Array.from(document.querySelectorAll('select.flex-1:nth-child(1) > option'), element => malJson.comic_url+'/'+(element as HTMLOptionElement).value).reverse(), malJson)
        const chapterText:string[] = await page.evaluate(() =>  Array.from(document.querySelectorAll('select.flex-1:nth-child(1) > option'), element => element.innerHTML.replace('Ch', 'Chapter')).reverse())

        if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) throw new Error('Manga: Unable to get chapters! Contact an admin!')
        await job.updateProgress(50)
        job.log(logWithTimestamp('Chapter Data fetched'))

        var resizedImage:Buffer|null = null
        if (icon) {
            const imageUrl = await page.evaluate(() => {
                const metaTag = document.querySelector('meta[property="og:image"]');
                return metaTag ? metaTag.getAttribute('content') : null;
            });
            if (config.logging.verboseLogging) console.log('Image Url: ' + imageUrl)
            await job.updateProgress(60)
            job.log(logWithTimestamp('Loading Icon'))
            const icon = await page.goto(imageUrl, {timeout: 10000})
            job.log(logWithTimestamp('Icon Loaded'))
            await job.updateProgress(80)
            console.log(icon)
            let iconBuffer = await icon?.buffer()
            console.log(iconBuffer)
            resizedImage = await sharp(iconBuffer)
                .resize(480, 720)
                .toBuffer()
        }
        await page.close()
        await job.updateProgress(90)
        job.log(logWithTimestamp('All Data Fetched! Proccessing Data'))

        const title = malJson.md_comic.title
        if (!title) throw Error('Manga: Unable to get Title!')

        const idMatch = url.match(/\/([^/]+)-chapter-[\d.]+(?:-[^/]+)?$/);
        if (!idMatch) throw Error('Manga: Invalid URL format! Contact an admin.')
        console.log(`${malJson.comic_url}/${idMatch[1]}`)
        const currIndex = chapterLinks.indexOf(`${malJson.comic_url}/${idMatch[1]}`)

        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Please retry or contact Admin!")
        }

        console.log(chapterText)
        console.log(chapterLinks)

        await job.updateProgress(100)
        job.log(logWithTimestamp('Done!'))
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