import {Env, userDataRow, mangaDataRowReturn, mangaDataRowProcessed, mangaDetails} from '../types'
import {verifyUserAuth, verifyIndexRange, validateCategory} from '../utils'

export async function getUnreadManga(access_token:string, authId:string, userCat:string = '%', sortMethod:string = 'interactTime', sortOrd:string = 'ASC', env: Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        const selectedCategory = validateCategory(sortMethod)
        const selectedSortOrd:'DESC'|'ASC' = sortOrd.toUpperCase() ==='DESC'?'DESC':'ASC'

        if (selectedCategory === "Invalid Category") return new Response(JSON.stringify({message: 'Invalid Category'}), {status: 400}) 

        console.log(authId + userCat + sortMethod + sortOrd)
        var userManga:mangaDetails[]|null = (await env.DB.prepare(
            `SELECT mangaData.mangaName, userData.mangaId, mangaData.urlList, mangaData.chapterTextList, mangaData.updateTime, userData.currentIndex, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ? AND userCat LIKE ? ORDER BY ${selectedCategory} ${selectedSortOrd}`
        )
            .bind(authId, userCat)
            .all()).results as any
        
        if (!userManga) {
            console.log(`No user data found for ${authId} with the cat ${userCat}`)
            return new Response(JSON.stringify({message:`No user data found for ${authId} with the cat ${userCat}`}), {status: 404})
        }

        for (var manga of userManga) {
            if ("string" === typeof manga.chapterTextList && "string" === typeof manga.urlList) {
                manga.chapterTextList = manga.chapterTextList.split(',')
                manga.urlList = manga.urlList.split(',')
            }
        }

        return new Response(JSON.stringify({mangaDetails: userManga}), {status: 200})
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({message:'unknown error occured'}), {status: 500})
    }
}

export async function getManga(access_token:string, authId:string, mangaId:string, env: Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        let userManga:mangaDetails = ((await env.DB.prepare("SELECT mangaData.mangaName, userData.mangaId, mangaData.urlList, mangaData.chapterTextList, mangaData.updateTime, userData.currentIndex, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ?  AND userData.mangaId = ? LIMIT 1")
            .bind(authId, mangaId).first()) as any)
            
        if (!userManga) {
            return new Response(JSON.stringify({message:'Unable to get Manga Data'}), {status: 500})
        }

        if ("string" === typeof userManga.chapterTextList && "string" === typeof userManga.urlList) {
            userManga.chapterTextList = userManga.chapterTextList.split(',')
            userManga.urlList = userManga.urlList.split(',')
        }

        return new Response(JSON.stringify({mangaDetails: userManga}), {status: 200})
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({message:'unknown error occured'}), {status: 500})
        return [];
    }
}

export async function getUserManga(access_token:string, authId:string, env:Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        let queryTimeDebug = 0
        const userRes = await env.DB.prepare('SELECT mangaData.mangaName, userData.mangaId, mangaData.urlList, mangaData.chapterTextList, mangaData.updateTime, userData.currentIndex, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ?')
            .bind(authId)
            .all()

        queryTimeDebug+= userRes.meta.duration
        let userManga:mangaDetails[] = userRes.results as any

        for (var manga of userManga) {
            if ("string" === typeof manga.chapterTextList && "string" === typeof manga.urlList) {
                manga.chapterTextList = manga.chapterTextList.split(',')
                manga.urlList = manga.urlList.split(',')
            }
        }
        
        console.log(`Query took ${queryTimeDebug} milliseconds to process`)

        return new Response(JSON.stringify({mangaDetails: userManga}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred'}), {status:500});
    }
}

export async function getAllManga(env:Env, pass:string|null) {
    try {
        const allManga:[{mangaName:string, mangaId:string}] = (await env.DB.prepare('SELECT mangaName, mangaId FROM mangaData')
                .all()).results as any
        console.log(allManga)
        return new Response(JSON.stringify({allData: allManga}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function userStats(access_token:string, authId:string, env:Env) {
    try{
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        const userManga:[{"currentIndex":string,"mangaId":string}] = (await env.DB.prepare('SELECT currentIndex, mangaId FROM userData WHERE userID = ? ')
            .bind(authId)
            .all()).results as any

        const mangaLists:{"chapterTextList":string, "mangaId":string}[] = (await env.DB.prepare('SELECT chapterTextList, mangaId FROM mangaData').all()).results as any


        // const userResults:any = (await env.DB.batch(boundMangaStmt))
        const mangaCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM mangaData').first()
        //Get new chapter count in last 30 days
        const updateCount = await env.DB.prepare('SELECT SUM(stat_value) AS total FROM stats WHERE type = "chapCount" AND timestamp > datetime("now", "-30 days")').first()
        const newCount = await env.DB.prepare('SELECT COUNT(stat_value) AS total FROM stats WHERE type = "mangaCount" AND timestamp > datetime("now", "-30 days")').first()


        var unreadChapters:number = 0
        var read:number = 0
        var unreadManga:number = 0
        var totalChapters:number = 0

        for (const currentMangaData of mangaLists) {
            if (!currentMangaData.chapterTextList) {
                console.warn(`${currentMangaData.mangaId} has no Chapter List!`)
                continue
            }
            let currentList:string[] = currentMangaData.chapterTextList.split(',')
            let lastChapNums = currentList[currentList.length-1].match(/[0-9.]+/g)
            let latestChapNumber:number = parseInt(lastChapNums![lastChapNums!.length -1])

            totalChapters+=latestChapNumber

            

            //If current manga is tracked by user
            let foundUserManga = userManga.find(manga => manga.mangaId === currentMangaData.mangaId)
            if (foundUserManga) {
                try {
                    let currentChapNums = currentList[verifyIndexRange(parseInt(foundUserManga.currentIndex), currentList.length)].match(/[0-9.]+/g)

                    read+= parseInt(currentChapNums![currentChapNums!.length-1])

                    const currUnread = (latestChapNumber)-(parseInt(currentChapNums![currentChapNums!.length-1]))
                    console.log(currUnread)
                    if (currUnread!=0) unreadManga++
                    unreadChapters+=currUnread
                } catch (error) {
                    console.log(error)
                    console.log('Issue fetching data for manga: ' + foundUserManga.mangaId)
                }
            }
        }
        const userStats = {"chaptersRead":read, "chaptersUnread":unreadChapters, "unreadManga": unreadManga, "readManga": userManga.length}
        const mangaStats = {"trackedManga": mangaCount?.count||0, "totalTrackedChapters":totalChapters, "newMangaCount": newCount?.total||0, "newChapterCount": updateCount?.total||0}

        return new Response(JSON.stringify({userStats: userStats, globalStats: mangaStats}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred' + err}), {status:500});
    }
}

export async function getUpdateData(env:Env, pass:string|null) {
    if (pass != env.SERVER_PASSWORD) return new Response(JSON.stringify({message: "Unauthorized"}), {status:401})
    try {
        const validationRes = await verifyUserAuth(pass, null, env, true)
        
        if (validationRes instanceof Response) return validationRes

        
        const allManga:[{mangaId:string, urlList:string}] = (await env.DB.prepare('SELECT urlList, mangaId FROM mangaData')
                .all()).results as any
        console.log(allManga)
        return new Response(JSON.stringify({data: allManga}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function pullUserCategories(access_token:string, authId:string, env:Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
                
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        const results = await env.DB.prepare('Select categories FROM userSettings WHERE userID = ?')
                .bind(authId)
                .first()

        // return default categories if no categories are found for user
        if (!results) return new Response(JSON.stringify({message: "No Custom Cats", cats: [
            {value: "reading", label: "Reading"},
            {value: "notreading", label: "Not Reading"},
            {value: "hold", label: "Hold"},
            {value: "finished", label: "Finished"},
            {value: "inqueue", label: "In Queue"},
            {value: "other", label: "Other"},
            {value: "unsorted", label: "Uncategorized"},
            {value: "%", label: "Any"}
        ]}), {status:200})
        
        return new Response(JSON.stringify({message:"Success", cats: JSON.parse(results.categories as string)}), {status:200})

    } catch (err) {
        console.warn("Error with updateInteractTime: " + err)
        return new Response(JSON.stringify({message: "An error occured" + err}), {status:500})
    }
}