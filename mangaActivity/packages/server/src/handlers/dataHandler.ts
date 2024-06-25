import {Env} from '../types';
import addHandler from './addHandler'
import removeHandler from './removeHandler';
import pullHandler from './pullHandler';
import updateHandler from './updateHandlers';

export default async function dataHandler(path: string[], request: Request, env: Env) {
    switch (path[1]) {
        case 'add':
            return await addHandler(path, request, env)
        case 'pull':
            return await pullHandler(path, request, env)
        case 'remove':
            return await removeHandler(path, request, env)
        case 'update':
            return await updateHandler(path, request, env)
        default:
            return new Response('Not found', {status: 404}); 
    }
}
