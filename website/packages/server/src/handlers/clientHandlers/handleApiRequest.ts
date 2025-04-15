import {Env} from '../../types';
import dataHandler from './dataHandler';
import { verifyUserAuth } from '../../utils';

export function handleApiRequest(path: string[], request: Request, env: Env) {
  switch (path[0]) {
    case 'data':
      return verifyUserAuth(path, request, env, dataHandler)
    default:
      return new Response('Not found', {status: 404});
  }
}
