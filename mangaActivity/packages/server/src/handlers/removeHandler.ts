import {Env, IGetEntitlements, IGetSKUs, EntitlementTypes, SKUFlags} from '../types';
import {readRequestBody, requestHeaders} from '../utils';
import {forgetUser, deleteUserManga} from '../dataUtils/removeUtils'

export default async function removeHandler(path: string[], request: Request, env: Env) {
    var body = {"access_token":"", "authId":"", "userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":""}
    try {
        body = JSON.parse(await readRequestBody(request))
    } catch {}
    if (body.access_token == 'mock_token') return new Response(JSON.stringify({message: 'Invalid Token! Restart activity'}), {status: 400})

    switch (path[2]) {
        case 'forgetUser':
            return await forgetUser(body.access_token, body.authId, env)
        case 'deleteUserManga':
            return await deleteUserManga(body.access_token, body.authId, body.mangaId, env)
    }
}