import { Message } from '@discord/embedded-app-sdk/output/schema/common'
import {Env, userDataRow, mangaDataRowReturn, user, mangaReturn} from '../types'
import {verifyUserAuth} from '../utils'
import { v4 as uuidv4 } from 'uuid'

export async function saveManga(access_token:string, authId:string, url:string, userCat:string = 'unsorted', env:Env) {
    try {
        console.log('starting manga req')
        const validationRes = await verifyUserAuth(access_token, authId, env)

        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        const mangaReq:any = await fetch(`${env.PUPPETEER_SERVER}/getManga?url=${url}&pass=${env.SERVER_PASSWORD}`, {
            method: 'GET'
        })
        // console.log(mangaReq)

        if (!mangaReq.ok) {
            const errorResp = await mangaReq.json()
            return new Response(JSON.stringify({
                message: errorResp.message,
                url: url
            }), {status:mangaReq.status})
        }

        const {fetchId} = await mangaReq.json()

        let mangaInfo:mangaReturn|null = null 
        let waiting = true
        while (waiting) {
            await new Promise((resolve) => setTimeout(resolve, 5000))

            let currentStatusRes = await fetch(`${env.PUPPETEER_SERVER}/checkStatus/get?fetchId=${fetchId}&pass=${env.SERVER_PASSWORD}`)

            if (currentStatusRes.status==200) {
                waiting = false

                mangaInfo = await currentStatusRes.json()
            } else if (currentStatusRes.status==500) { //forward error to user
                const errorResp:{message:string} = await currentStatusRes.json()
                return new Response(JSON.stringify({
                    message: errorResp.message,
                    url: url
                }), {status:currentStatusRes.status})
            } else if (currentStatusRes.status==404) { //send internal server error if fetchId isnt found
                return new Response(JSON.stringify({Message: 'Internal Server Error!'}), {status:500})
            }
        }

        if (!mangaInfo) return new Response(JSON.stringify({Message: 'Internal Server Error!'}), {status:500})

        // const mangaInfo:mangaReturn = await mangaReq.json()
        const mangaRowTest:mangaDataRowReturn|null|undefined = await env.DB.prepare(
            "SELECT * FROM mangaData WHERE mangaName = ?"
        ) 
            .bind(mangaInfo.mangaName)
            .first()

        // console.log(mangaRowTest)
        
        const currentTime = new Date().toLocaleDateString("en-US", {year: "numeric", month: "numeric", day: "numeric", timeZone: "America/Los_Angeles", timeZoneName: "short", hour: "numeric", minute: "numeric", hour12: true })
        
        var mangaId = ''
        var mangaStmt
        // if manga isnt in database insert data otherwise update it
        if (!mangaRowTest) {
            console.log('not already in db')

            //track new manga being added to DB
            await env.DB.prepare('INSERT INTO stats (timestamp, type, stat_value) VALUES (CURRENT_TIMESTAMP, "mangaCount", ?)').bind(1).run()

            mangaId = uuidv4().toString() //generate manga ID if manga isn't already in DB
            // console.log(mangaId)
            mangaStmt = env.DB.prepare('INSERT INTO mangaData (mangaId,mangaName,urlList,chapterTextList,updateTime) VALUES(?,?,?,?,?)')
                .bind(mangaId, mangaInfo.mangaName, mangaInfo.chapterUrlList, mangaInfo.chapterTextList, currentTime)
            // }
        } else {

            console.log('already in db' + mangaRowTest.mangaId)
            mangaId = mangaRowTest.mangaId

            mangaStmt = env.DB.prepare('Update mangaData SET urlList = ?, chapterTextList = ?, updateTime = ? WHERE mangaName = ? AND mangaId = ?')
                .bind(mangaInfo.chapterUrlList, mangaInfo.chapterTextList, currentTime, mangaInfo.mangaName, mangaId)
        }

        const bufferData = new Uint8Array(mangaInfo.iconBuffer.data).buffer//convert json buffer to arrayBuffer and saves it to r2 database using mangaId as the keyu
        const imgMetric = await env.IMG.put(mangaId, bufferData, {httpMetadata:{contentType:"image/jpeg"}})

        const userRowTest:string|null = await env.DB.prepare(
            'SELECT userCat FROM userData WHERE userID = ? AND mangaId = ?') 
            .bind(authId, mangaId)
            .first()

        var userStmt
        //test if user is already tracking manga and if they are update entry. otherwise add a new one
        if (!userRowTest) {
            userStmt = env.DB.prepare('INSERT INTO userData (userID,mangaName,mangaId,currentIndex,userCat,interactTime) VALUES(?,?,?,?,?,?)')
            .bind(authId, mangaInfo.mangaName, mangaId, mangaInfo.currentIndex, userCat, Date.now())
        } else {
            userStmt = env.DB.prepare('UPDATE userData SET currentIndex = ?, userCat = ?, interactTime = ? WHERE userID = ? AND mangaName = ? AND mangaId = ?')
            .bind(mangaInfo.currentIndex, userCat, Date.now(), authId, mangaInfo.mangaName, mangaId)
        }
        
        const metric = await env.DB.batch([
            mangaStmt,
            userStmt
        ])

        //If environment isn't prod send collected metrics for debugging
        if (env.ENVIRONMENT != 'production') return new Response(JSON.stringify({message: mangaId, metric: metric, img: imgMetric}))
        return new Response(JSON.stringify({message: mangaId}))
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({message: 'an unknown error occured' + error}), {status:500});
    }
}


