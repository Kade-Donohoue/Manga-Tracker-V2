import {Env} from './types';
import {handleApiRequest} from './handleApiRequest';
import {handleErrors} from './handleErrors';
export default {
  async fetch(request: Request, env: Env) {
    return await handleErrors(request, async () => {
      // We have received an HTTP request! Parse the URL and route the request.
      const url = await new URL(request.url);
      const path = url.pathname.slice(1).split('/');

      if (request.method === 'OPTIONS') {
        // console.log('OPTIONS Request')
        // Handle CORS preflight request
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      }    

      switch (path[0]) {
        case 'api':
          // This is a request for `/api/...`, call the API handler.
          // console.log(path)
          let newResp = await handleApiRequest(path.slice(1), request, env);

          if ( newResp instanceof Response) {
            let modResp = new Response(newResp.body, newResp)
            modResp.headers.set('Access-Control-Allow-Origin', '*'); // Use your domain in production
            modResp.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            modResp.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            return modResp
          }
          return new Response(JSON.stringify({'message': 'Internal Server Error'}), {status: 500})
        default:
          console.log("Unknown subdirectory tried" + path)
          return new Response('Not found', {status: 404});
      }
    });
  },
};
