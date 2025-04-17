import {Env, userDataRow, mangaDataRowReturn, mangaDataRowProcessed, mangaDetails} from '../types'
import {verifyIndexRange} from '../utils'

export async function getUnreadManga(authId:string, userCat:string = '%', sortMethod:string = 'interactTime', sortOrd:string = 'ASC', env: Env) {
    try {
        console.log({"authId": authId, "userCat": userCat, "sortMethod": sortMethod, "sortOrd":sortOrd})
        
        var userManga:mangaDetails[]|null = (await env.DB.prepare(
            `SELECT mangaData.mangaName, userData.mangaId, mangaData.urlBase, mangaData.slugList, mangaData.chapterTextList, mangaData.updateTime, userData.currentIndex, userData.currentChap, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ? AND userCat LIKE ? ORDER BY ${sortMethod} ${sortOrd}`
        )
            .bind(authId, userCat)
            .all()).results as any
        
        if (!userManga) {
            console.log({"message": 'No User data found!', "authId":authId, "userCat":userCat})
            return new Response(JSON.stringify({message:`No user data found for ${authId} with the cat ${userCat}`}), {status: 404})
        }

        for (let i = userManga.length -1; i >= 0; i--) {
            let manga = userManga[i]

            if (typeof manga.chapterTextList === "string" && typeof manga.slugList === "string") {
                userManga[i].chapterTextList = manga.chapterTextList.split(',')
                userManga[i].slugList = manga.slugList.split(',')
            }

            if (userManga[i].slugList.length-1 <= userManga[i].currentIndex) userManga.splice(i,1)
        }

        return new Response(JSON.stringify({mangaDetails: userManga}), {status: 200})
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({message:'unknown error occured'}), {status: 500})
    }
}

export async function getManga(authId:string, mangaId:string, env: Env) {
    try {

        let userManga:mangaDetails = ((await env.DB.prepare("SELECT mangaData.mangaName, userData.mangaId, mangaData.urlBase, mangaData.slugList, mangaData.chapterTextList, mangaData.updateTime, userData.currentIndex, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ?  AND userData.mangaId = ? LIMIT 1")
            .bind(authId, mangaId).first()) as any)
            
        if (!userManga) {
            return new Response(JSON.stringify({message:'Unable to get Manga Data'}), {status: 500})
        }

        if ("string" === typeof userManga.chapterTextList && "string" === typeof userManga.slugList) {
            userManga.chapterTextList = userManga.chapterTextList.split(',')
            userManga.slugList = userManga.slugList.split(',')
        }

        return new Response(JSON.stringify({mangaDetails: userManga}), {status: 200})
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({message:'unknown error occured'}), {status: 500})
        return [];
    }
}

export async function getUserManga(authId:string, env:Env) {
    try {
        let queryTimeDebug = 0
        const userRes = await env.DB.prepare('SELECT mangaData.mangaName, userData.mangaId, mangaData.urlBase, mangaData.slugList, mangaData.chapterTextList, mangaData.updateTime, userData.currentChap, userData.currentIndex, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ?')
            .bind(authId)
            .all()

        queryTimeDebug+= userRes.meta.duration
        let userManga:mangaDetails[] = userRes.results as any

        for (var manga of userManga) {
            if ("string" === typeof manga.chapterTextList && "string" === typeof manga.slugList) {
                manga.chapterTextList = manga.chapterTextList.split(',')
                manga.slugList = manga.slugList.split(',')
            }
        }
        
        // console.log(`Query took ${queryTimeDebug} milliseconds to process`)

        return new Response(JSON.stringify({mangaDetails: userManga}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred'}), {status:500});
    }
}

export async function getAllManga(env:Env, pass:string|null) {
    try {
        //Remove all manga that no user is tracking
        await env.DB.prepare('DELETE FROM mangaData WHERE mangaId NOT IN (SELECT mangaId FROM userData)').run()

        const allManga:[{mangaName:string, mangaId:string}] = (await env.DB.prepare('SELECT mangaName, mangaId FROM mangaData')
                .all()).results as any
        // console.log(allManga)
        return new Response(JSON.stringify({allData: allManga}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function userStats(authId:string, env:Env) {
    try{
        // 
        
        // if (validationRes instanceof Response) return validationRes
        // authId = validationRes

        let results = await env.DB.batch([
            env.DB.prepare(`SELECT u.currentIndex, u.mangaId, m.chapterTextList, u.userCat FROM userData u JOIN mangaData m ON u.mangaId = m.mangaId WHERE u.userID = ?`).bind(authId),
            env.DB.prepare('SELECT COUNT(*) AS total FROM mangaData'),
            env.DB.prepare('SELECT SUM(stat_value) AS total FROM stats WHERE type = "chapCount" AND timestamp > datetime("now", "-30 days")'),
            env.DB.prepare('SELECT SUM(stat_value) AS total FROM stats WHERE type = "mangaCount" AND timestamp > datetime("now", "-30 days")')
        ])
        console.log(results)

        const userManga   = results[0].results as { currentIndex: string; mangaId: string; chapterTextList: string, userCat: string }[];
        const mangaCount  = results[1].results[0] as {total: number}
        const updateCount = results[2].results[0] as {total: number}
        const newCount    = results[3].results[0] as {total: number}

        console.log(mangaCount)

        let unreadChapters:number = 0
        let read:number = 0
        let unreadManga:number = 0
        let totalChapters:number = 0

        for (const manga of userManga) {
            if (!manga.chapterTextList) {
                console.warn(`${manga.mangaId} has no Chapter List!`)
                continue
            }
            let currentList:string[] = manga.chapterTextList.split(',')
            let lastChapNums = currentList[currentList.length-1].match(/[0-9.]+/g)
            if (!lastChapNums) continue
            let latestChapNumber:number = parseInt(lastChapNums![lastChapNums!.length -1])

            totalChapters+=latestChapNumber

            try {
                let currentChapNums = currentList[verifyIndexRange(parseInt(manga.currentIndex), currentList.length)].match(/[0-9.]+/g)
                
                if (currentChapNums) {
                    const currentReadChap = parseInt(currentChapNums[currentChapNums.length - 1])
                    read+= currentReadChap
                    const currUnread = (latestChapNumber)-(currentReadChap)
                    // console.log(currUnread)
                    if (manga.userCat==='dropped') continue
                    if (currUnread!=0) unreadManga++
                    unreadChapters+=currUnread
                }
            } catch (error) {
                console.log({"message":'Issue fetching data for manga', "mangaId":manga.mangaId, "error":error})
            }
        }
        const userStats = {"chaptersRead":read, "chaptersUnread":unreadChapters, "unreadManga": unreadManga, "readManga": userManga.length}
        const mangaStats = {"trackedManga": mangaCount?.total||0, "totalTrackedChapters":totalChapters, "newMangaCount": newCount?.total||0, "newChapterCount": updateCount?.total||0}

        return new Response(JSON.stringify({userStats: userStats, globalStats: mangaStats}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred' + err}), {status:500});
    }
}

export async function getUpdateData(env:Env, pass:string|null) {
    if (pass != env.SERVER_PASSWORD) return new Response(JSON.stringify({message: "Unauthorized"}), {status:401})
    try {
        const allManga:[{mangaId:string, urlBase:string, slugList:string, mangaName: string}] = (await env.DB.prepare('SELECT urlBase, slugList, mangaId, mangaName FROM mangaData')
                .all()).results as any
        // console.log(allManga)
        return new Response(JSON.stringify({data: allManga}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function pullUserCategories(authId:string, env:Env) {
    try {
        let categories = [
            {value: "reading", label: "Reading"},
            {value: "notreading", label: "Not Reading"},
            {value: "dropped", label: "Dropped"},
            {value: "hold", label: "Hold"},
            {value: "finished", label: "Finished"},
            {value: "inqueue", label: "In Queue"},
            {value: "other", label: "Other"},
            {value: "unsorted", label: "Uncategorized"},
            {value: "%", label: "Any"}
        ]

        const results = await env.DB.prepare('Select categories FROM userSettings WHERE userID = ?')
                .bind(authId)
                .first<{categories: string}>()

        // return default categories if no categories are found for user
        if (!results) return new Response(JSON.stringify({message: "No Custom Cats", cats: categories}), {status:200})
        
        return new Response(JSON.stringify({message:"Success", cats: categories.concat(JSON.parse(results.categories))}), {status:200})

    } catch (err) {
        console.warn("Error with updateInteractTime: " + err)
        return new Response(JSON.stringify({message: "An error occured" + err}), {status:500})
    }
}