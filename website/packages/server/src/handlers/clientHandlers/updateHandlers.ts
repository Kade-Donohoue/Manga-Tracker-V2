import {Env} from '../../types';
import {updateCurrentIndex, updateInteractTime, changeMangaCat, updateUserCategories} from '../../dataUtils/updateUtils'

export default async function updateHandler(path: string[], request: Request, env: Env, userId: string) {
    var body = {"userCat":"", "sortMeth":"%", "sortOrd":"", "url":"", "newIndex":"", "mangaId":"", "interactionTime":"", "newCat":"", "newData":[], "newCatList":"", "amountNewChapters":0}
    try {
        body = await request.json()
    } catch {
        return new Response(JSON.stringify({message: 'Bad Data'}), {status:400})
    }

    switch (path[2]) {
        case 'updateCurrentIndex':
            return await updateCurrentIndex(userId, body.newIndex, body.mangaId, env)
        case 'updateInteractTime':
            return await updateInteractTime(userId, body.mangaId, body.interactionTime, env)
        case 'changeMangaCat':
            return await changeMangaCat(userId, body.mangaId, body.newCat, env)
        // case 'bulkUpdateMangaInfo':
        //     // console.log(body.toString())
        //     return await bulkUpdateMangaInfo(body.newData, body.amountNewChapters, env)
        case 'updateUserCategories':
            return await updateUserCategories(userId, body.newCatList, env)
    }
}