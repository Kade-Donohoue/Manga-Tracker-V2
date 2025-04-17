import {Env, mangaIdSchema} from '../../types';
import {forgetUser, deleteUserManga} from '../../dataUtils/removeUtils'
import { zodParse } from '../../utils';

export default async function removeHandler(path: string[], request: Request, env: Env, userId: string) {
    switch (path[2]) {
        case 'forgetUser': {
            return await forgetUser(userId, env)
        }
        case 'deleteUserManga': {
            const body = await zodParse(request, mangaIdSchema)
            if (body instanceof Response) return body // returns zod errors
            
            return await deleteUserManga(userId, body.mangaId, env)
        }
    }
}