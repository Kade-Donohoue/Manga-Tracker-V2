import {Env, mangaReturn} from '../types'

export async function updateCurrentIndex(authId:string, newIndex:string, mangaId: string, env:Env) {
    try {
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
export async function updateManga(authId:string, url:string, env:Env) { // should base off id instead of name needs completly changed
    try {
        return new Response(JSON.stringify({message: 'Deprecated!'}), {status: 410})
        // const interactTime = Date.now()
        // const currentTime = new Date().toLocaleDateString("en-US", {year: "numeric", month: "numeric", day: "numeric", timeZone: "America/Los_Angeles", timeZoneName: "short", hour: "numeric", minute: "numeric", hour12: true })

        // const mangaReq:any = await fetch(`${env.PUPPETEER_SERVER}/getManga?url=${url}`, {//authToken=${authToken}&userCat=${userCat}&
        //     method: 'GET'
        // })
        // const mangaInfo:mangaReturn = await mangaReq.json()


        // // console.log(mangaInfo)

        // await env.DB.prepare('UPDATE userData SET currentIndex = ?, interactTime = ? WHERE userID = ? AND mangaName = ?')
        //     .bind(mangaInfo.currentIndex, interactTime, authId, mangaInfo.mangaName)
        //     .run()

        // await env.DB.prepare('Update mangaData SET urlList = ?, chapterTextList = ?, updateTime = ? WHERE mangaName = ?')
        //     .bind(mangaInfo.chapterUrlList, mangaInfo.chapterTextList, currentTime, mangaInfo.mangaName)
        //     .run()

        // return new Response(JSON.stringify({message:"Success"}), {status:200})
    } catch (err) {
        return new Response(JSON.stringify(err), {status:500})
    }
}

export async function updateInteractTime(authId:string, mangaId:string, interactTime:string, env:Env) {
    try{
        await env.DB.prepare('UPDATE userData SET interactTime = ? WHERE userID = ? AND mangaId = ?')
                .bind(interactTime, authId, mangaId)
                .run()
        
        return new Response(JSON.stringify({message:"Success"}), {status:200})

    } catch (err) {
        console.warn("Error with updateInteractTime: " + err)
        return new Response(JSON.stringify({message: "An error occured" + err}), {status:500})
    }
}

export async function changeMangaCat(authId:string, mangaId:string, newCat:string, env:Env) {
    if (newCat == "%") newCat = "unsorted"

    const metric = await env.DB.prepare('UPDATE userData SET userCat = ? WHERE userID = ? AND mangaId = ?')
            .bind(newCat, authId, mangaId)
            .run()

    console.log({"metrics":metric})
    
    if (metric.success) return new Response(JSON.stringify({message:"Success"}), {status:200})

    return new Response(JSON.stringify({message:"Unable to change Category. Contact an Admin!"}), {status:500})
}

export async function updateUserCategories(authId:string, newCatList:any, env:Env) {
    try {
        const metrics = await env.DB.prepare('INSERT INTO userSettings (userID, categories) values (?, ?) ON CONFLICT(userID) DO UPDATE SET categories = excluded.categories')
                .bind(authId, newCatList)
                .run()
        
        return new Response(JSON.stringify({message:"Success", metrics: metrics}), {status:200})

    } catch (err) {
        console.warn("Error with updateInteractTime: " + err)
        return new Response(JSON.stringify({message: "An error occured" + err + authId}), {status:500})
    }
}