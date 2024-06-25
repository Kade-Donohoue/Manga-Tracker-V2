import {Env, IGetEntitlements, IGetSKUs, EntitlementTypes, SKUFlags, updateData} from '../types';
import {readRequestBody, requestHeaders} from '../utils';
import {updateManga, updateCurrentIndex, updateInteractTime, changeMangaCat, bulkUpdateMangaInfo} from '../dataUtils/updateUtils'

export default async function updateHandler(path: string[], request: Request, env: Env) {
    var body = {"access_token":"", "authId":"", "userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":"", "newData":[]}
    try {
        body = JSON.parse(await readRequestBody(request))
    } catch {
        return new Response(JSON.stringify({message: 'Bad Data'}), {status:400})
    }
    if (body.access_token == 'mock_token') return new Response(JSON.stringify({message: 'Invalid Token! Restart activity'}), {status: 400})

    switch (path[2]) {
        case 'updateManga':
            return await updateManga(body.access_token, body.authId, body.url, env)
        case 'updateCurrentIndex':
            return await updateCurrentIndex(body.access_token, body.authId, body.newIndex, body.mangaId, env)
        case 'updateInteractTime':
            return await updateInteractTime(body.access_token, body.authId, body.mangaId, body.interactionTime, env)
        case 'changeMangaCat':
            return await changeMangaCat(body.access_token, body.authId, body.mangaId, body.newCat, env)
        case 'bulkUpdateMangaInfo':
            console.log(body.toString())
            return await bulkUpdateMangaInfo(body.newData, env)
    }
}