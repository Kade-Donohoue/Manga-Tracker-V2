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

    try {
        const slug = extractSlug(url)
        if (config.logging.verboseLogging) console.log('slug: ', slug)
        job.log(logWithTimestamp('Fetching Comic Data with following slug: ' + slug))
        const comicData:comicData = await (await fetch(`https://api.comick.fun/comic/${slug}`)).json()
        if (config.logging.verboseLogging) console.log('comic Data: ', comicData)
        await job.updateProgress(20)
        job.log(logWithTimestamp('comic Data Retrieved!'))
        
        job.log(logWithTimestamp('Fetching Chapter Data'))
        const chapterData:chapterData = await (await fetch(`https://api.comick.fun/comic/${comicData.comic.hid}/chapters?lang=en&limit=${comicData.comic.chapter_count}`)).json()
        if (config.logging.verboseLogging) console.log('Chapter Data: ', chapterData)
        await job.updateProgress(40)
        job.log(logWithTimestamp('chapter Data Retrieved!'))

        job.log(logWithTimestamp('begining to parse data'))

        let hid = url.split('/').at(-1).toLowerCase()
        hid = hid.replace(/-chapter-\d+-\w+$/g, '')
        // const hidMatch = url.match(/\/([^/]+)-chapter-[\d.]+(?:-[^/]+)?$/)
        if (config.logging.verboseLogging) console.log('hid: ', hid)
        const chapterMap:ChapterMap = {}
        let userChap = null
        chapterData.chapters.forEach(item => {
            const { hid, chap, up_count } = item


            if (!chapterMap[chap] || chapterMap[chap].up_count < up_count) {
                chapterMap[chap] = {
                    chapter: chap?`Chapter ${chap}`:'Chapter Unknown',
                    url: `https://comick.io/comic/${slug}/${hid}`,
                    up_count
                }
            }

            if (!hid) return
            if (hid === hid) userChap = chapterMap[chap].chapter
        })
        console.log('userChap: ', userChap)

        const chapters: string[] = []
        const urls: string[] = []
        Object.values(chapterMap).sort((a, b) => {
            if (a.chapter === "Chapter Unknown" && b.chapter !== "Chapter Unknown") return -1
            if (a.chapter !== "Chapter Unknown" && b.chapter === "Chapter Unknown") return 1

            return a.chapter.localeCompare(b.chapter, undefined, { numeric: true })
        }).forEach(({ chapter, url }, i) => {
            chapters.push(chapter)
            urls.push(url)
        })
        job.updateProgress(70)
        job.log(logWithTimestamp('Chapter Data parsed getting final data!'))

        if (config.logging.verboseLogging) {
            console.log('urls: ', urls.join(','))
            console.log('chapters: ', chapters.join(','))
        }

        let currIndex = chapters.indexOf(userChap)
        if (currIndex == -1 && !ignoreIndex) {
            throw new Error("Manga: unable to find current chapter. Please retry or contact Admin!")
        }

        
        let resizedImage:Buffer|null = null
        if (icon) {
            job.log(logWithTimestamp('Fetching image!'))
            const iconBuffer = await (await fetch(`https://meo.comick.pictures/${comicData.comic.md_covers[0].b2key}`)).arrayBuffer()
            job.updateProgress(80)
            job.log(logWithTimestamp('image fetched resizing!'))
            resizedImage = await sharp(iconBuffer)
            .resize(480, 720)
            .toBuffer()
            job.updateProgress(90)
            job.log(logWithTimestamp('image resized!'))
        }

        job.updateProgress(100)
        job.log(logWithTimestamp('All data fetched!'))
        return {
            "mangaName": getEnglishTitle(comicData.comic.md_titles, comicData.comic.title), 
            "chapterUrlList": urls.join(','), 
            "chapterTextList": chapters.join(','), 
            "currentIndex": currIndex, 
            "iconBuffer": resizedImage
        }
    } catch (err) {
        job.log(logWithTimestamp(`Error: ${err}`))
        console.warn(`Unable to fetch data for: ${url}`)
        if (config.logging.verboseLogging) console.warn(err)
        
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
    
        lastTimestamp = currentTimestamp
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

    function extractSlug(url: string): string | null {
        const match = url.match(/comick\.io\/comic\/([^/]+)/)
        return match ? match[1] : null
    }

    function getEnglishTitle(titles:{title:string, lang:string}[], defaultTitle:string = 'unknown') {
        for (let i = 0; i < titles.length; i++) {
            if (!titles[i].lang) continue
            if (titles[i].lang.toLowerCase() === 'en') return titles[i].title
        }

        return defaultTitle
    }
}

type comicData = {
    firstChap: {
        chap: string, 
        hid: string,
        lang: string,
        group_names: string[]
        vol: null
    },
    comic: {
        id: number,
        hid: string,
        title: string, 
        country: string,
        status: number,
        links: {
            mu: string
        }, 
        lastChapter: number,
        chapter_count: number,
        demographic: number, 
        user_follow_count: number, 
        follow_rank: number, 
        follow_count: number, 
        desc: string,
        parsed: string, 
        slug: string,
        mismatch: null,
        year: number,
        bayesian_rating: null, 
        rating_count: number,
        content_rating: string,
        translation_completed: boolean,
        chapter_numbers_reset_on_new_volume_manual: boolean,
        final_chapter: null, 
        final_volume: null,
        noindex: boolean, 
        adsense: boolean, 
        login_required: boolean,
        recommendations: [],
        relate_from: [],
        md_titles: {title: string, lang: string}[]
        md_comic_md_genres: {mdGenres:{name: string, type: string, slug: string, group: string}}[]
        md_covers: {vol: string, w: number, h: number, b2key: string}[]
        mu_comics: {
            mu_comic_publishers: {
                mu_publishers: {title: string, slug: string}
            }[],
            licensed_in_english:null,
            mu_comic_categories: {
                mu_categories: {title: string, slug: string}
                positive_vote: number,
                negative_vote: number
            }[]
        },
        iso639_1: string,
        lang_name: string,
        lang_native: string
    },
    artists: {name: string, slug: string}[],
    authors: {name: string, slug: string}[], 
    langList: string[], 
    recommendable: boolean,
    demographic: string,
    englishLink: null,
    matureContent: boolean
}

type chapterData = {
    chapters: {
        id: number,
        chap: string,
        title: string,
        vol: string,
        lang: string,
        created_at: string,
        updated_at: string,
        up_count: number,
        down_count: number,
        is_the_last_chapter: boolean,
        publish_at: null,
        group_name: string[],
        hid: string,
        identities: null,
        md_chapters_groups: {
            md_groups: {title: string, slug: string}
        }[]
    }[],
    total: number, 
    limit: number
}

type ChapterDetails = {
    chapter: string,
    url: string,
    up_count: number
}

type ChapterMap = {
    [chap: string]: ChapterDetails
}