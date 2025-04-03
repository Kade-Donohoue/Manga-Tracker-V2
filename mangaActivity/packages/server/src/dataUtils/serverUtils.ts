import { Env, updateDataType } from "../types";

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

export async function updateManga(newData:updateDataType, newChapterCount:number, env:Env) {
    try {
        console.log(newData)
        const stmt = env.DB.prepare('UPDATE mangaData SET urlBase = ?, slugList = ?, chapterTextList = ? WHERE mangaId = ?')

        var boundStmt:D1PreparedStatement[] = []
        for (var i = 0; i < newData.length; i++) {
            // console.log(newData[i].chapterUrlList, newData[i].chapterTextList, newData[i].mangaId)
            boundStmt.push(stmt.bind(newData[i].urlBase, newData[i].slugList, newData[i].chapterTextList, newData[i].mangaId))

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