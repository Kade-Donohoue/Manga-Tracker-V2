import { Status } from '@discord/embedded-app-sdk/output/schema/common'
import {Env, mangaDataRowReturn, mangaReturn} from '../types'
import {verifyUserAuth} from '../utils'
import { v4 as uuidv4 } from 'uuid'

export async function saveManga(access_token:string, authId:string, urls:string[], userCat:string = 'unsorted', env:Env) {
    try {
        console.log('starting manga req')
        const validationRes = await verifyUserAuth(access_token, authId, env)

        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        if (urls && urls.length <= 0 ) return new Response(JSON.stringify({Message: 'No Urls Provided!'}), {status:500}) 

        const mangaReq:any = await fetch(`${env.PUPPETEER_SERVER}/getManga?urls=${urls.join('&urls=')}&pass=${env.SERVER_PASSWORD}`, {
            method: 'GET'
        })
        // console.log(mangaReq)

        if (!mangaReq.ok) {
            const errorResp = await mangaReq.json()
            return new Response(JSON.stringify({
                message: errorResp.message
            }), {status:mangaReq.status})
        }

        //response from puppeteer server with ids to check
        const {addedManga, errors}:{addedManga:{fetchId:string,url:string}[], errors:{message:string, url:string, success:false}[]} = await mangaReq.json()

        const waitingManga = new Map<string, string>( addedManga.map(item => [item.fetchId, item.url]))

        let newMangaInfo:mangaReturn[] = [] 
        let userReturn:{url:string, message:string, success:boolean}[] = [...errors]
        while (waitingManga.size >= 1) {
            await new Promise((resolve) => setTimeout(resolve, 5000))

            let currentStatusRes = await fetch(`${env.PUPPETEER_SERVER}/checkStatus/get?fetchIds=${Array.from(waitingManga.keys()).join('&fetchIds=')}&pass=${env.SERVER_PASSWORD}`)

            if (!currentStatusRes.ok) continue

            let { currentStatus }:{currentStatus:{fetchId:string,status:string,statusCode:number,data:any}[]}= await currentStatusRes.json() 

            for (let currentJobStatus of currentStatus) {
                if (currentJobStatus.statusCode === 202) { //still processing
                    continue
                } else if (currentJobStatus.statusCode === 200) { //Finished
                    newMangaInfo.push(currentJobStatus.data)
                    userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: 'Successfully added', success: true})
                    waitingManga.delete(currentJobStatus.fetchId)
                } else if (currentJobStatus.statusCode === 500) {//failed
                    userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: currentJobStatus.data, success: false})
                    waitingManga.delete(currentJobStatus.fetchId)
                } else if (currentJobStatus.statusCode === 404) {//Job Lost?
                    userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: "Internal Server Error!", success: false})
                    waitingManga.delete(currentJobStatus.fetchId)
                } else { //unknown
                    userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: "An unknown Error occurred please contact an admin!", success: false})
                    waitingManga.delete(currentJobStatus.fetchId)
                }
            }
        }

        if (userReturn.length <= 0) return new Response(JSON.stringify({Message: 'Internal Server Error!'}), {status:500})

        if (newMangaInfo.length <= 0) return new Response(JSON.stringify({results: userReturn}), {status: 200})

        const mangaRowTestStmts:D1PreparedStatement[] = newMangaInfo.map(mangaInfo => env.DB.prepare("SELECT * FROM mangaData WHERE mangaName = ? LIMIT 1") //check if manga has matching name
            .bind(mangaInfo.mangaName))

        let mangaTestResults:{results:mangaDataRowReturn[]}[] = await env.DB.batch(mangaRowTestStmts) as any
        // console.log(mangaRowTest)
        
        const currentTime = new Date().toLocaleDateString("en-US", {year: "numeric", month: "numeric", day: "numeric", timeZone: "America/Los_Angeles", timeZoneName: "short", hour: "numeric", minute: "numeric", hour12: true })
        
        let boundAddStmtsArrs:D1PreparedStatement[][] = await Promise.all(mangaTestResults.map(async (testResult:{results:mangaDataRowReturn[]}, index:number) => {
            
            let newBoundStmt:D1PreparedStatement[] = []

            let mangaId = testResult?.results?.[0]?.mangaId||uuidv4().toString() //use existing id or create new one if not exist

            newBoundStmt.push(env.DB.prepare(
                'INSERT INTO mangaData (mangaId,mangaName,urlList,chapterTextList,updateTime) VALUES (?,?,?,?,?) ON CONFLICT(mangaId) DO UPDATE SET urlList = excluded.urlList, chapterTextList = excluded.chapterTextList, updateTime = excluded.updateTime'
            ).bind(mangaId, newMangaInfo[index].mangaName, newMangaInfo[index].chapterUrlList, newMangaInfo[index].chapterTextList, currentTime))

            newBoundStmt.push(env.DB.prepare(
                'Insert INTO userData (userId, mangaId, currentIndex, userCat, interactTime) VALUES (?,?,?,?,?) ON CONFLICT(userID, mangaId) DO UPDATE SET currentIndex = excluded.currentIndex, userCat = excluded.userCat, interactTime = excluded.interactTime'
            ).bind(validationRes, mangaId, newMangaInfo[index].currentIndex, userCat, Date.now()))
            
            await env.IMG.put(mangaId, new Uint8Array(newMangaInfo[index].iconBuffer.data).buffer, {httpMetadata:{contentType:"image/jpeg"}}) //Save Cover Image with title as mangaId

            return newBoundStmt
        }))
        
        let boundAddStmts:D1PreparedStatement[] = boundAddStmtsArrs.flat()
 
        const dbMetrics = await env.DB.batch(boundAddStmts)

        let newMangaCount:number = 0
        //goes through all mangaData results skipping userData and stats
        for (let i = 0; i < dbMetrics.length; i+=2) {
            // console.log(i)
            if (dbMetrics[i].meta.last_row_id!=0) {
                newMangaCount++
            }
        }

        let statMetric = await env.DB.prepare('INSERT INTO stats (timestamp, type, stat_value) VALUES (CURRENT_TIMESTAMP, "mangaCount", ?)').bind(newMangaCount).run()

        //If environment isn't prod send collected metrics for debugging
        if (env.ENVIRONMENT != 'production') return new Response(JSON.stringify({results: userReturn, dataMetric: dbMetrics, statMetric: statMetric, newManga: newMangaCount}))
        return new Response(JSON.stringify({results: userReturn}))
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({message: 'an unknown error occured' + error}), {status:500});
    }
}


