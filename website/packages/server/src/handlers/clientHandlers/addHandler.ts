import {Env} from '../../types';
import {saveManga} from '../../dataUtils/addUtils'

export default async function addHandler(path: string[], request: Request, env: Env, userId: string) {
    var body = {"userCat":"", "sortMeth":"%", "sortOrd":"", "urls":[], "newIndex":"", "mangaName":"", "interactionTime":"", "newCat":""}
    try {
        body = await request.json()
    } catch {}
    switch (path[2]) {
        case 'addManga':
            return await saveManga(userId, body.urls, body.userCat, env)
        
    }
}