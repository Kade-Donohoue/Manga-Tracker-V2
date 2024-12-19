import config from './config.json'
import { mangaUrlCheck } from './types'

export function match(string:string, subStrings:string[]) {
    for (const subString of subStrings) {
        if (string.includes(subString)) return true
    }
    return false
}

export function validMangaCheck(url:string):mangaUrlCheck {
    if (!url.includes('http')) return {success: false, value: 'invalid URL Format!', statusCode: 422}
    if (!url.includes('chapter') && !url.includes('ch-')) return {success: false, value: 'link provided is for an overview page. Please provide a link to a specific chapter page!', statusCode: 422}
    
    if (url.includes('manganato') && config.sites.allowManganatoScans) return {success: true, value: 'manganato'}
    else if (url.includes('mangadex') && config.sites.allowMangaDex) return {success: true, value: 'mangadex'}
    else if (url.includes('reaperscans') && config.sites.allowReaperScans) return {success: true, value: 'reaperScans'}
    else if (url.includes('reaper-scan') && config.sites.allowReaperScansFake) return {success: true, value: 'reaper-scans-fake'}
    else if (url.includes('asura') && config.sites.allowAsura) return {success: true, value: 'asura'}
    else if (url.includes('comick') && config.sites.allowComick) return {success: true, value: 'comick'}
    else return {success: false, value: 'Unsupported WebPage!', statusCode: 422}
}