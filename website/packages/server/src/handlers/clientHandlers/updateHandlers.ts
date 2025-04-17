import {Env, updateCurrentIndexSchema, updateInteractTimeSchema, changeMangaCatSchema, updateUserCategoriesSchema} from '../../types';
import {updateCurrentIndex, updateInteractTime, changeMangaCat, updateUserCategories} from '../../dataUtils/updateUtils'
import { zodParse } from '../../utils';

export default async function updateHandler(path: string[], request: Request, env: Env, userId: string) {
    switch (path[2]) {
        case 'updateCurrentIndex': {
            const body = await zodParse(request, updateCurrentIndexSchema)
            if (body instanceof Response) return body // returns zod errors
        
            return await updateCurrentIndex(userId, body.newIndex, body.mangaId, env)
        }
        case 'updateInteractTime': {
            const body = await zodParse(request, updateInteractTimeSchema)
            if (body instanceof Response) return body // returns zod errors
        
            return await updateInteractTime(userId, body.mangaId, body.interactionTime, env)
        }
        case 'changeMangaCat': {
            const body = await zodParse(request, changeMangaCatSchema)
            if (body instanceof Response) return body // returns zod errors
        
            return await changeMangaCat(userId, body.mangaId, body.newCat, env)
        }
        // case 'bulkUpdateMangaInfo':
        //     // console.log(body.toString())
        //     return await bulkUpdateMangaInfo(body.newData, body.amountNewChapters, env)
        case 'updateUserCategories': {
            const body = await zodParse(request, updateUserCategoriesSchema)
            if (body instanceof Response) return body // returns zod errors
        
            return await updateUserCategories(userId, body.newCatList, env)
        }
    }
}