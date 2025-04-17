import {Env, mangaIdSchema, getUnreadSchema} from '../../types';
import {getUnreadManga, getUserManga, getManga, userStats, pullUserCategories} from '../../dataUtils/pullUtils'
import { zodParse } from '../../utils';

export default async function pullHandler(path: string[], request: Request, env: Env, userId: string) {

    switch (path[2]) {
        case 'getUnread': {
            const body = await zodParse(request, getUnreadSchema)
            if (body instanceof Response) return body // returns zod errors

            return await getUnreadManga(userId, body.userCat, body.sortMeth, body.sortOrd, env)
        }
        case 'getUserManga': {
            return await getUserManga(userId, env)
        }
        case 'getManga': {
            const body = await zodParse(request, mangaIdSchema)
            if (body instanceof Response) return body // returns zod errors

            return await getManga(userId, body.mangaId, env)
        }
        case 'userStats': {
            return await userStats(userId, env)
        }
        case 'pullUserCategories': {
            return await pullUserCategories(userId, env)
        }
    }
}