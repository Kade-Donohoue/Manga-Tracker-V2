import {Env, IGetEntitlements, IGetSKUs, EntitlementTypes, SKUFlags} from '../types';
import {readRequestBody, requestHeaders} from '../utils';
import {getUnreadManga, getUserManga, getAllManga, getManga, userStats, getUpdateData, pullUserCategories} from '../dataUtils/pullUtils'

export default async function pullHandler(path: string[], request: Request, env: Env) {
    var body = {"access_token":"", "authId":"", "userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":""}
    try {
        body = JSON.parse(await readRequestBody(request))
    } catch {}
    if (body.access_token == 'mock_token') return new Response(JSON.stringify({message: 'Invalid Token! Restart activity'}), {status: 400})

    switch (path[2]) {
        case 'getUnread':
            return await getUnreadManga(body.access_token, body.authId, body.userCat, body.sortMeth, body.sortOrd, env)
        case 'getUserManga':
            return await getUserManga(body.access_token, body.authId, env)
        case 'getAllManga':
            return await getAllManga(env, request.headers.get("pass"))
        case 'getManga':
            return await getManga(body.access_token, body.authId, body.mangaId, env)
        case 'userStats':
            return await userStats(body.access_token, body.authId, env)
        case 'getUpdateData':
            return await getUpdateData(env, request.headers.get("pass"))
        case 'pullUserCategories':
            return await pullUserCategories(body.access_token, body.authId, env)
    }
}