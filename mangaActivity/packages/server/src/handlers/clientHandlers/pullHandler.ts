import {Env} from '../../types';
import {getUnreadManga, getUserManga, getManga, userStats, pullUserCategories} from '../../dataUtils/pullUtils'

export default async function pullHandler(path: string[], request: Request, env: Env, userId: string) {
    var body = {"access_token":"", "authId":"", "userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":""}
    try {
        body = await request.json()
    } catch {}
    if (body.access_token == 'mock_token') return new Response(JSON.stringify({message: 'Invalid Token! Restart activity'}), {status: 400})

    switch (path[2]) {
        case 'getUnread':
            return await getUnreadManga(userId, body.userCat, body.sortMeth, body.sortOrd, env)
        case 'getUserManga':
            return await getUserManga(userId, env)
        case 'getManga':
            return await getManga(userId, body.mangaId, env)
        case 'userStats':
            return await userStats(userId, env)
        case 'pullUserCategories':
            return await pullUserCategories(userId, env)
    }
}