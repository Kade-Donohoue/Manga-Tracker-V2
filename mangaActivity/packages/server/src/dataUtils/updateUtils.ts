import {Env, mangaReturn, updateData} from '../types'
import {verifyUserAuth} from '../utils'

export async function updateCurrentIndex(access_token:string, authId:string, newIndex:string, mangaId: string, env:Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        if ( !newIndex || !mangaId ) return new Response(JSON.stringify({message: "Invalid Argument"}), {status:400})

        const res = await env.DB.prepare('UPDATE userData SET currentIndex = ?, interactTime = ? WHERE userID = ? AND mangaId = ?')
                .bind(newIndex, Date.now(), authId, mangaId)
                .run()

        return new Response(JSON.stringify({message: "Success"}), {status:200})
    } catch (err) {
        return new Response(JSON.stringify({message: "An error occurred" + err}), {status:500})
    }
}

//Broken
export async function updateManga(access_token:string, authId:string, url:string, env:Env) { // should base off id instead of name needs completly changed
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        const interactTime = Date.now()
        const currentTime = new Date().toLocaleDateString("en-US", {year: "numeric", month: "numeric", day: "numeric", timeZone: "America/Los_Angeles", timeZoneName: "short", hour: "numeric", minute: "numeric", hour12: true })

        const mangaReq:any = await fetch(`${env.PUPPETEER_SERVER}/getManga?url=${url}`, {//authToken=${authToken}&userCat=${userCat}&
            method: 'GET'
        })
        const mangaInfo:mangaReturn = await mangaReq.json()


        // console.log(mangaInfo)

        await env.DB.prepare('UPDATE userData SET currentIndex = ?, interactTime = ? WHERE userID = ? AND mangaName = ?')
            .bind(mangaInfo.currentIndex, interactTime, authId, mangaInfo.mangaName)
            .run()

        await env.DB.prepare('Update mangaData SET urlList = ?, chapterTextList = ?, updateTime = ? WHERE mangaName = ?')
            .bind(mangaInfo.chapterUrlList, mangaInfo.chapterTextList, currentTime, mangaInfo.mangaName)
            .run()

        return new Response(JSON.stringify({message:"Success"}), {status:200})
    } catch (err) {
        return new Response(JSON.stringify(err), {status:500})
    }
}

export async function updateInteractTime(access_token:string|null=null, authId:string, mangaId:string, interactTime:string, env:Env) {
    try{
        const validationRes = await verifyUserAuth(access_token, authId, env)
            
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        await env.DB.prepare('UPDATE userData SET interactTime = ? WHERE userID = ? AND mangaId = ?')
                .bind(interactTime, authId, mangaId)
                .run()
        
        return new Response(JSON.stringify({message:"Success"}), {status:200})

    } catch (err) {
        console.warn("Error with updateInteractTime: " + err)
        return new Response(JSON.stringify({message: "An error occured" + err}), {status:500})
    }
}

export async function changeMangaCat(access_token:string|null=null, authId:string, mangaId:string, newCat:string, env:Env) {

    const validationRes = await verifyUserAuth(access_token, authId, env)
            
    if (validationRes instanceof Response) return validationRes
    authId = validationRes

    if (newCat == "%") newCat = "unsorted"

    const metric = await env.DB.prepare('UPDATE userData SET userCat = ? WHERE userID = ? AND mangaId = ?')
            .bind(newCat, authId, mangaId)
            .run()

    console.log({"metrics":metric})
    
    if (metric.success) return new Response(JSON.stringify({message:"Success"}), {status:200})

    return new Response(JSON.stringify({message:"Unable to change Category. Contact an Admin!"}), {status:500})
}

export async function bulkUpdateMangaInfo(access_token:string, newData:updateData[], amountNewChapters:number, env:Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, null, env, true)
            
        if (validationRes instanceof Response) return validationRes

        // console.log(newData)
        const stmt = env.DB.prepare('UPDATE mangaData SET urlList = ?, chapterTextList = ? WHERE mangaId = ?')

        var boundStmt:D1PreparedStatement[] = []
        for (var i = 0; i < newData.length; i++) {
            // console.log(newData[i].chapterUrlList, newData[i].chapterTextList, newData[i].mangaId)
            boundStmt.push(stmt.bind(newData[i].chapterUrlList, newData[i].chapterTextList, newData[i].mangaId))

            if (newData[i].iconBuffer) {
                await env.IMG.put(newData[i].mangaId, new Uint8Array(newData[i].iconBuffer!.data).buffer, {httpMetadata:{contentType:"image/jpeg"}}) //Save Cover Image with title as mangaId
            }
        }
        boundStmt.push(env.DB.prepare('INSERT INTO stats (timestamp, type, stat_value) VALUES (CURRENT_TIMESTAMP, "chapCount", ?)').bind(amountNewChapters))
        // boundStmt.push(env.DB.prepare('DELETE FROM stats WHERE timestamp < datetime("now", "-30 days")')) //removes any stat thats older than 30 days

        await env.DB.batch(boundStmt)

        return new Response(JSON.stringify({message:"Success"}), {status:200})
    } catch (err) {
        console.error("Error:", err)
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function updateUserCategories(access_token:string, authId:string, newCatList:any, env:Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
                
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        const metrics = await env.DB.prepare('INSERT INTO userSettings (userID, categories) values (?, ?) ON CONFLICT(userID) DO UPDATE SET categories = excluded.categories')
                .bind(authId, newCatList)
                .run()
        
        return new Response(JSON.stringify({message:"Success", metrics: metrics}), {status:200})

    } catch (err) {
        console.warn("Error with updateInteractTime: " + err)
        return new Response(JSON.stringify({message: "An error occured" + err + authId}), {status:500})
    }
}