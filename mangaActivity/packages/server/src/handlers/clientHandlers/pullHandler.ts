import {Env} from '../../types';
import {getUnreadManga, getUserManga, getManga, userStats, pullUserCategories} from '../../dataUtils/pullUtils'

export default async function pullHandler(path: string[], request: Request, env: Env, userId: string) {
    var body = {"userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":""}
    try {
        body = await request.json()
    } catch {}

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