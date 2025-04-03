import {Env} from '../../types';
import {forgetUser, deleteUserManga} from '../../dataUtils/removeUtils'

export default async function removeHandler(path: string[], request: Request, env: Env, userId: string) {
    var body = {"access_token":"", "authId":"", "userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":""}
    try {
        body = await request.json()
    } catch {}
    if (body.access_token == 'mock_token') return new Response(JSON.stringify({message: 'Invalid Token! Restart activity'}), {status: 400})

    switch (path[2]) {
        case 'forgetUser':
            return await forgetUser(userId, env)
        case 'deleteUserManga':
            return await deleteUserManga(userId, body.mangaId, env)
    }
}