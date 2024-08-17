import {Env, userDataRow, mangaDataRowReturn, mangaDataRowProcessed} from '../types'
import {verifyUserAuth, verifyIndexRange} from '../utils'

export async function getUnreadManga(access_token:string, authId:string, userCat:string = '%', sortMethod:string = 'interactTime', sortOrd:string = 'ASC', env: Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        console.log(authId + userCat + sortMethod + sortOrd)
        var userData:userDataRow[]|null = (await env.DB.prepare(
            `SELECT * FROM userData WHERE userID = ? AND userCat LIKE ? ORDER BY ${sortMethod} ${sortOrd}`
        )
            .bind(authId, userCat/*`${sortMethod} ${sortOrd}`*/)
            .all()).results as any
        
        console.log(userData)
        if (!userData) {
            console.log(`No user data found for ${authId} with the cat ${userCat}`)
            return new Response(JSON.stringify({message:`No user data found for ${authId} with the cat ${userCat}`}), {status: 404})
        }

        var mangaData:mangaDataRowProcessed[] = []
        for (var i:number = 0; i < userData.length; i++) {
            const userManga = userData[i]
            var mangaInfo:mangaDataRowReturn|null = await env.DB.prepare(
                `SELECT * FROM mangaData WHERE mangaName = ?`
            )
                .bind(userManga.mangaName)
                .first()

            if (!mangaInfo) {
                console.log("Could not get manga Data")
                mangaInfo = {
                    "mangaId": "null",
                    "mangaName": "null",
                    "urlList": "null",
                    "chapterTextList": "null", 
                    "updateTime": "null"
                }
            }
            const mangaDataProcessed:mangaDataRowProcessed = {
                "mangaId": mangaInfo.mangaId,
                "mangaName": mangaInfo.mangaName,
                "urlList": mangaInfo.urlList.split(','),
                "chapterTextList": mangaInfo.chapterTextList.split(','), 
                "updateTime": mangaInfo.updateTime
            }
            if (mangaDataProcessed.chapterTextList.length  <= userManga.currentIndex + 1) {
                userData.splice(i, 1)
                i--
                continue
            }
            mangaData.push(mangaDataProcessed)
        }

        return new Response(JSON.stringify({"userInfo": userData, "mangaData": mangaData}), {status: 200})
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

        const userData:userDataRow|null = (await env.DB.prepare(
            `SELECT * FROM userData WHERE userID = ? AND mangaId = ?`
        )
            .bind(authId, mangaId)
            .first()) as any
        
        console.log(userData)
        if (!userData) {
            console.log(`No user data found for ${authId}`)
            return new Response(JSON.stringify({message:`No user data found`}), {status: 404})
        }

        var mangaInfo:mangaDataRowReturn|null = await env.DB.prepare(
            `SELECT * FROM mangaData WHERE mangaId = ?`
        )
            .bind(mangaId)
            .first()

        if (!mangaInfo) {
            return new Response(JSON.stringify({message:'Unable to get Manga Data'}), {status: 500})
        }

        return new Response(JSON.stringify({"userInfo": userData, "mangaData": mangaInfo}), {status: 200})
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
        const userRes = await env.DB.prepare('SELECT * FROM userData WHERE userID = ?')
            .bind(authId)
            .all()

        queryTimeDebug+= userRes.meta.duration
        const userManga:userDataRow[] = userRes.results as any

        let boundMangaDataStmt:D1PreparedStatement[] = []
        for (const manga of userManga) {
            boundMangaDataStmt.push(env.DB.prepare(`SELECT * FROM mangaData WHERE mangaId = ? LIMIT 1`).bind(manga.mangaId))
        }

        const mangaRes = await env.DB.batch(boundMangaDataStmt)

        let mangaData:mangaDataRowProcessed[] = []
        for (const resRow of mangaRes) {
            queryTimeDebug+=resRow.meta.duration
            let results:mangaDataRowReturn = resRow.results[0] as any
            if (!results) {
                console.warn('Could not fetch data for Manga Check DB!!!')
                mangaData.push({
                    "mangaId": "null",
                    "mangaName": "null",
                    "urlList": [],
                    "chapterTextList": [], 
                    "updateTime": "null"
                })
                continue
            } else {
                mangaData.push({
                    "mangaId": results.mangaId,
                    "mangaName": results.mangaName,
                    "urlList": results.urlList.split(','),
                    "chapterTextList": results.chapterTextList.split(','), 
                    "updateTime": results.updateTime
                })
            }
        }
        
        console.log(`Query took ${queryTimeDebug} milliseconds to process`)

        return new Response(JSON.stringify({userInfo: userManga, mangaData: mangaData}), {status:200})
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

//ToDo: Stat for total tracked manga
//Idea: Stat for new chapters / day?
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
        
        return new Response(JSON.stringify({message:"Success", cats: results?.categories}), {status:200})

    } catch (err) {
        console.warn("Error with updateInteractTime: " + err)
        return new Response(JSON.stringify({message: "An error occured" + err}), {status:500})
    }
}