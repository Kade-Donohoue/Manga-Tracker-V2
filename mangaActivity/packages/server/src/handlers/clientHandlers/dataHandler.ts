import {Env} from '../../types';
import addHandler from './addHandler'
import removeHandler from './removeHandler';
import pullHandler from './pullHandler';
import updateHandler from './updateHandlers';

export default async function dataHandler(path: string[], request: Request, env: Env, userId: string) {
    switch (path[1]) {
        case 'add':
            return await addHandler(path, request, env, userId)
        case 'pull':
            return await pullHandler(path, request, env, userId)
        case 'remove':
            return await removeHandler(path, request, env, userId)
        case 'update':
            return await updateHandler(path, request, env, userId)
        default:
            return new Response('Not found', {status: 404}); 
    }
}
