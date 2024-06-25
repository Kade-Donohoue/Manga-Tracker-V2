import {Env, userDataRow, mangaDataRowReturn, user, mangaReturn} from '../types'
import {getUserID} from '../utils'

export async function forgetUser(access_token:string|null=null, authId:string, env:Env) {
    try {
        if (access_token) authId = await getUserID(access_token)

        await env.DB.prepare('DELETE FROM userData WHERE userID = ?')
                .bind(authId)
                .run()
        return new Response(JSON.stringify({message: "Success"}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}

export async function deleteUserManga(access_token:string|null=null, authId:string, mangaId:string, env:Env) {
    try {
        if (access_token) authId = await getUserID(access_token)

        await env.DB.prepare('DELETE FROM userData WHERE userID = ? AND mangaId = ?')
                .bind(authId, mangaId)
                .run()
        return new Response(JSON.stringify({message: "Success", data: authId+mangaId}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occured'}), {status:500});
    }
}