import {Env, userDataRow, mangaDataRowReturn, user, mangaReturn} from '../types'
import {verifyUserAuth} from '../utils'

export async function forgetUser(access_token:string|null=null, authId:string, env:Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        await env.DB.prepare('DELETE FROM userData WHERE userID = ?')
                .bind(authId)
                .run()
        return new Response(JSON.stringify({message: "Success"}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred'}), {status:500});
    }
}

export async function deleteUserManga(access_token:string|null=null, authId:string, mangaId:string, env:Env) {
    try {
        const validationRes = await verifyUserAuth(access_token, authId, env)
        
        if (validationRes instanceof Response) return validationRes
        authId = validationRes

        await env.DB.prepare('DELETE FROM userData WHERE userID = ? AND mangaId = ?')
                .bind(authId, mangaId)
                .run()
        return new Response(JSON.stringify({message: "Success", data: authId+mangaId}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred'}), {status:500});
    }
}