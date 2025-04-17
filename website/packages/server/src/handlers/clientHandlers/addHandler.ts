import {Env, addMangaSchema} from '../../types';
import {saveManga} from '../../dataUtils/addUtils'
import { zodParse } from '../../utils';

export default async function addHandler(path: string[], request: Request, env: Env, userId: string) {
    switch (path[2]) {
        case 'addManga': {
            const body = await zodParse(request, addMangaSchema)
            if (body instanceof Response) return body // returns zod errors
            
            return await saveManga(userId, body.urls, body.userCat, env)
        }
    }
}