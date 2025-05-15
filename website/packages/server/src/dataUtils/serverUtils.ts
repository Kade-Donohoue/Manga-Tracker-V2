import { z } from "zod";
import { clerkUserSchema, Env, updateDataType } from "../types";

/**
 * pulls all manga from DB includeds mangas name, urlList, and id
 * @param env environment
 * @returns Response with array of manga within data
 */
export async function getAllManga(env:Env) {
    try {
        const allManga:[{mangaId:string, urlBase:string, slugList:string, mangaName:string}] = (await env.DB.prepare('SELECT urlBase, slugList, mangaId, mangaName FROM mangaData')
                .all()).results as any
        return new Response(JSON.stringify({data: allManga}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function updateManga(newData:updateDataType, newChapterCount:number, expiresAt:number, env:Env) {
    try {
        console.log(newData)
        await env.KV.put('expiresAt', expiresAt.toString())
        const stmt = env.DB.prepare('UPDATE mangaData SET urlBase = ?, slugList = ?, chapterTextList = ?, latestChapterText = ? WHERE mangaId = ?')

        var boundStmt:D1PreparedStatement[] = []
        for (var i = 0; i < newData.length; i++) {
            // console.log(newData[i].chapterUrlList, newData[i].chapterTextList, newData[i].mangaId)
            boundStmt.push(stmt.bind(newData[i].urlBase, newData[i].slugList, newData[i].chapterTextList, newData[i].chapterTextList.slice(newData[i].chapterTextList.lastIndexOf(',')+1), newData[i].mangaId))

            if (newData[i].iconBuffer) {
                await env.IMG.put(newData[i].mangaId, new Uint8Array(newData[i].iconBuffer!.data).buffer, {httpMetadata:{contentType:"image/jpeg"}}) //Save Cover Image with title as mangaId
            }
        }
        boundStmt.push(env.DB.prepare('INSERT INTO stats (timestamp, type, stat_value) VALUES (CURRENT_TIMESTAMP, "chapCount", ?)').bind(newChapterCount))

        await env.DB.batch(boundStmt)

        return new Response(JSON.stringify({message:"Success"}), {status:200})
    } catch (err) {
        console.error("Error:", err)
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function fixCurrentChaps(env: Env) {
    const { results: users } = await env.DB
        .prepare("SELECT userData.userID, userData.mangaId, userData.currentIndex, mangaData.chapterTextList FROM userData JOIN mangaData ON userData.mangaId = mangaData.mangaId")
        .all();

    let batchedJobs:D1PreparedStatement[] = []

    for (const user of users) {
    // const manga = await env.DB
    //     .prepare("SELECT chapterTextList FROM mangaData WHERE mangaId = ?")
    //     .bind(user.mangaId)
    //     .first<{ chapterTextList: string }>();

    if (!user?.chapterTextList) continue;

    const chapterList = String(user.chapterTextList)
        .split(',') 
        .map((c) => c.trim());

    const chapterText = chapterList[Number(user.currentIndex)] ?? -1;
    const lastChap = chapterList[chapterList.length-1] ?? -1

    batchedJobs.push(env.DB
        .prepare("UPDATE userData SET currentChap = ? WHERE mangaId = ? AND userID = ?")
        .bind(chapterText, user.mangaId, user.userID))

    batchedJobs.push(env.DB
        .prepare("UPDATE mangaData SET latestChapterText = ? WHERE mangaId = ?")
        .bind(lastChap, user.mangaId))
    }

    await env.DB.batch(batchedJobs)

    return new Response("Fixed currentChap for all users.");
}

export async function newUser(user:z.infer<typeof clerkUserSchema>, env:Env) {
    const results = await env.DB.prepare('INSERT OR REPLACE INTO users (userID, userName, imageUrl, createdAt) VALUES (?, ?, ?, ?)')
        .bind(
            user.data.id,
            user.data.username,
            user.data.image_url,
            user.data.created_at
        ).run()

    if (!results.success) return new Response(JSON.stringify({message: 'Unable To save Data!', results: results}), {status:500});
    return new Response(JSON.stringify({message: 'User Saved!', results: results}), {status: 200})
}