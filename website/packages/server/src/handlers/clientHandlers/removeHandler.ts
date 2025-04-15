import {Env} from '../../types';
import {forgetUser, deleteUserManga} from '../../dataUtils/removeUtils'

export default async function removeHandler(path: string[], request: Request, env: Env, userId: string) {
    var body = {"userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":""}
    try {
        body = await request.json()
    } catch {}

    switch (path[2]) {
        case 'forgetUser':
            return await forgetUser(userId, env)
        case 'deleteUserManga':
            return await deleteUserManga(userId, body.mangaId, env)
    }
}