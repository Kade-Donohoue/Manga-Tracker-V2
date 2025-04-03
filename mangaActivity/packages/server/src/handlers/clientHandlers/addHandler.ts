import {Env} from '../../types';
import {saveManga} from '../../dataUtils/addUtils'

export default async function addHandler(path: string[], request: Request, env: Env, userId: string) {
    var body = {"access_token":"", "authId":"", "userCat":"", "sortMeth":"%", "sortOrd":"", "urls":[], "newIndex":"", "mangaName":"", "interactionTime":"", "newCat":""}
    try {
        body = await request.json()
    } catch {}
    if (body.access_token == 'mock_token') return new Response(JSON.stringify({message: 'Invalid Token! Restart activity'}), {status: 400})

    switch (path[2]) {
        case 'addManga':
            return await saveManga(userId, body.urls, body.userCat, env)
        
    }
}