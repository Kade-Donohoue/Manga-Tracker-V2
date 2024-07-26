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

        const userManga:userDataRow[] = (await env.DB.prepare('SELECT * FROM userData WHERE userID = ?')
                .bind(authId)
                .all()).results as any



        var mangaData:mangaDataRowProcessed[] = []
        for (var i:number = 0; i < userManga.length; i++) {
            var mangaInfo:mangaDataRowReturn|null = await env.DB.prepare(
                `SELECT * FROM mangaData WHERE mangaId = ?`
            )
                .bind(userManga[i].mangaId)
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

            mangaData.push(mangaDataProcessed)
        }
        
        return new Response(JSON.stringify({userInfo: userManga, mangaData: mangaData}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
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

        const mangaStmt = env.DB.prepare('SELECT chapterTextList FROM mangaData WHERE mangaId = ?')

        var boundMangaStmt:D1PreparedStatement[] = []
        for (var i = 0; i < userManga.length; i++) {
            boundMangaStmt.push(mangaStmt.bind(userManga[i].mangaId))
        }

        const userResults:any = (await env.DB.batch(boundMangaStmt))
        const rowCount = await env.DB.prepare('SELECT COUNT(*) as count FROM mangaData').first()


        var unreadChapters = 0
        var read = 0
        var unreadManga = 0

        for (var i = 0; i < userResults.length; i++) {
            const currResults:string[] = (userResults[i].results[0].chapterTextList).split(',')
            var currentChap = currResults[verifyIndexRange(parseInt(userManga[i].currentIndex), currResults.length)] 
            var chapNumStr = currentChap.match(/[0-9.]+/g)
            var latestNumStr = currResults[currResults.length-1].match(/[0-9.]+/g)
            read+= parseInt(chapNumStr![chapNumStr!.length-1])
            const currUnread = (parseInt(latestNumStr![latestNumStr!.length -1]))-(parseInt(chapNumStr![chapNumStr!.length-1]))
            if (currUnread!=0) unreadManga++
            unreadChapters+=currUnread
        }

        const userStats = {"chaptersRead":read, "chaptersUnread":unreadChapters, "unreadManga": unreadManga, "readManga": userManga.length}
        const mangaStats = {"trackedManga": rowCount?.count||0}

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