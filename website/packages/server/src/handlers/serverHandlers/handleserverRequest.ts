import {Env} from '../../types';
import { validateServerAuth } from '../../utils';
import serverDataHandler from './serverDataHandler';
import userHandler from './serverUserHandler';

export function handleServerRequest(path: string[], request: Request, env: Env) {
  // console.log(path)
  switch (path[0]) {
    case 'data':
      return validateServerAuth(path, request, env, serverDataHandler)
    case 'user':
      return validateServerAuth(path, request, env, userHandler)
    default:
      return new Response(JSON.stringify({message: 'Not found', path: path[0]}), {status: 404});
  }
}
