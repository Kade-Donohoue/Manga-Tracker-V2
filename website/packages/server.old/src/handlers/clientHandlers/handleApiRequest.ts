import {Env} from '../../types';
import dataHandler from './dataHandler';
import { verifyUserAuth } from '../../utils';
import friendHandler from './friendHandler';

export function handleApiRequest(path: string[], request: Request, env: Env) {
  switch (path[0]) {
    case 'data':
      return verifyUserAuth(path, request, env, dataHandler)
    case 'friends': 
      return verifyUserAuth(path, request, env, friendHandler)
    default:
      return new Response('Not found', {status: 404});
  }
}
