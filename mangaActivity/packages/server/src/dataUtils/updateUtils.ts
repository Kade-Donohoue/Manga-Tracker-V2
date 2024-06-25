import {Env, mangaReturn, updateData} from '../types'
import {getUserID} from '../utils'

export async function updateCurrentIndex(access_token:string, authId:string, newIndex:string, mangaId: string, env:Env) {
    try {
        if ( !newIndex || !mangaId ) return new Response(JSON.stringify({message: "Invalid Argument"}), {status:400})
        if (access_token!="null") authId = await getUserID(access_token)

        const res = await env.DB.prepare('UPDATE userData SET currentIndex = ?, interactTime = ? WHERE userID = ? AND mangaId = ?')
                .bind(newIndex, Date.now(), authId, mangaId)
                .run()

        return new Response(JSON.stringify({message: "Success"}), {status:200})
    } catch (err) {
        return new Response(JSON.stringify({message: "An error occured" + err}), {status:500})
    }
}

export async function updateManga(authToken:string, authId:string, url:string, env:Env) { // should base off id instead of name needs completly changed
    try {
        const interactTime = Date.now()
        const currentTime = new Date().toLocaleDateString("en-US", {year: "numeric", month: "numeric", day: "numeric", timeZone: "America/Los_Angeles", timeZoneName: "short", hour: "numeric", minute: "numeric", hour12: true })
        if (authToken) authId = await getUserID(authToken)

        const mangaReq:any = await fetch(`${env.PUPPETEER_SERVER}/getManga?url=${url}`, {//authToken=${authToken}&userCat=${userCat}&
            method: 'GET'
        })
        const mangaInfo:mangaReturn = await mangaReq.json()


        console.log(mangaInfo)

        env.DB.prepare('UPDATE userData SET currentIndex = ?, interactTime = ? WHERE userID = ? AND mangaName = ?')
            .bind(mangaInfo.currentIndex, interactTime, authId, mangaInfo.mangaName)
            .run()

        env.DB.prepare('Update mangaData SET urlList = ?, chapterTextList = ?, updateTime = ? WHERE mangaName = ?')
            .bind(mangaInfo.chapterUrlList, mangaInfo.chapterTextList, currentTime, mangaInfo.mangaName)
            .run()

        return new Response(JSON.stringify({message:"Success"}), {status:200})
    } catch (err) {
        return new Response(JSON.stringify(err), {status:500})
    }
}

export async function updateInteractTime(authToken:string|null=null, authId:string, mangaId:string, interactTime:string, env:Env) {

    if (authToken) authId = await getUserID(authToken)

    await env.DB.prepare('UPDATE userData SET interactTime = ? WHERE userID = ? AND mangaId = ?')
            .bind(interactTime, authId, mangaId)
            .run()
    
    return new Response(JSON.stringify({message:"Success"}), {status:200})
}

export async function changeMangaCat(authToken:string|null=null, authId:string, mangaId:string, newCat:string, env:Env) {

    if (authToken) authId = await getUserID(authToken)

    env.DB.prepare('UPDATE userData SET userCat = ? WHERE userID = ? AND mangaId = ?')
            .bind(newCat, authId, mangaId)
            .run()
    
    return new Response(JSON.stringify({message:"Success"}), {status:200})
}

export async function bulkUpdateMangaInfo(newData:updateData[], env:Env) {
    try {
        console.log(newData)
        const stmt = env.DB.prepare('UPDATE mangaData SET urlList = ?, chapterTextList = ? WHERE mangaId = ?')

        var boundStmt:D1PreparedStatement[] = []
        for (var i = 0; i < newData.length; i++) {
            boundStmt.push(stmt.bind(newData[i].chapterUrlList, newData[i].chapterTextList, newData[i].mangaId))
        }

        await env.DB.batch(boundStmt)

        return new Response(JSON.stringify({message:"Success"}), {status:200})
    } catch (err) {
        console.error("Error:", err)
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}