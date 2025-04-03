import {Env} from '../../types';
import { validateServerAuth } from '../../utils';
import serverDataHandler from './serverDataHandler';

export function handleServerRequest(path: string[], request: Request, env: Env) {
  // console.log(path)
  switch (path[0]) {
    case 'data':
      return validateServerAuth(path, request, env, serverDataHandler)
    default:
      return new Response(JSON.stringify({message: 'Not found', path: path[0]}), {status: 404});
  }
}
