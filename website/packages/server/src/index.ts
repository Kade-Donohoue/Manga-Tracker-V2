import {Env} from './types';
import {handleApiRequest} from './handlers/clientHandlers/handleApiRequest';
import {handleErrors} from './handlers/handleErrors';
import { handleServerRequest } from './handlers/serverHandlers/handleserverRequest';
export default {
  async fetch(request: Request, env: Env) {
    return await handleErrors(request, async () => {
      // We have received an HTTP request! Parse the URL and route the request.
      const url = await new URL(request.url);
      const path = url.pathname.slice(1).split('/');

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': env.VITE_CLIENT_URL, // Use your domain in production
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          }
        });
      }
    

      switch (path[0]) {
        case 'api':
          // This is a request for `/api/...`, call the API handler.
          console.log(path)
          let newResp = await handleApiRequest(path.slice(1), request, env);

          if ( newResp instanceof Response) {
            let modResp = new Response(newResp.body, newResp)
            modResp.headers.set('Access-Control-Allow-Origin', env.VITE_CLIENT_URL)
            modResp.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            modResp.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            modResp.headers.set('Access-Control-Allow-Credentials', 'true')

            return modResp
          }
          return new Response(JSON.stringify({'message': 'Internal Server Error'}), {status: 500})
        case 'serverReq': 
          return await handleServerRequest(path.slice(1), request, env)
        default:
          console.log("Unknown subdirectory tried" + path)
          return new Response(JSON.stringify({message: 'Not found', path: path[0]}), {status: 404});
      }
    });
  },
};
