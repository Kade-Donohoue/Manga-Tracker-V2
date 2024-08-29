import {Env, IGetEntitlements, IGetSKUs, EntitlementTypes, SKUFlags} from '../types';
import {readRequestBody, requestHeaders} from '../utils';
import {saveManga} from '../dataUtils/addUtils'

export default async function addHandler(path: string[], request: Request, env: Env) {
    var body = {"access_token":"", "authId":"", "userCat":"", "sortMeth":"%", "sortOrd":"", "urls":[], "newIndex":"", "mangaName":"", "interactionTime":"", "newCat":""}
    try {
        body = JSON.parse(await readRequestBody(request))
    } catch {}
    if (body.access_token == 'mock_token') return new Response(JSON.stringify({message: 'Invalid Token! Restart activity'}), {status: 400})

    switch (path[2]) {
        case 'addManga':
            return await saveManga(body.access_token.toString(), body.authId, body.urls, body.userCat, env)
        
    }
}