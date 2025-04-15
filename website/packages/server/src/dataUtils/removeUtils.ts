import {Env} from '../types'

export async function forgetUser(authId:string, env:Env) {
    try {
        await env.DB.batch([
            env.DB.prepare('DELETE FROM userData WHERE userID = ?').bind(authId),
            env.DB.prepare('DELETE FROM userSettings WHERE userID = ?').bind(authId)
        ])

        return new Response(JSON.stringify({message: "Success"}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred'}), {status:500});
    }
}

export async function deleteUserManga(authId:string, mangaId:string, env:Env) {
    try {
        await env.DB.prepare('DELETE FROM userData WHERE userID = ? AND mangaId = ?')
                .bind(authId, mangaId)
                .run()
        return new Response(JSON.stringify({message: "Success", data: authId+mangaId}), {status:200})
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({message: 'an unknown error occurred'}), {status:500});
    }
}