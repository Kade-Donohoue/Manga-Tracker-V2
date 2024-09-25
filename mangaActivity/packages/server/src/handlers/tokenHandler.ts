import {Env, IGetOAuthToken} from '../types';
import {readRequestBody, requestHeaders} from '../utils';

export default async function tokenHandler(path: string[], request: Request, env: Env) {
  try {
    const body = JSON.parse(await readRequestBody(request));
    const tokenBody = new URLSearchParams({
      client_id: env.VITE_CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: env.VITE_CLIENT_URL
    });
    console.log(tokenBody)
    const response = await fetch(`${env.VITE_DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: requestHeaders(env, {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: tokenBody,
    });
    // return new Response(`Internal Error: ${response}`, {status: 500});
    if (response.status != 200) {
      console.log(tokenBody)
      return response;
    }

    const {access_token, expires_in, refresh_token} = await response.json<IGetOAuthToken>();

    return new Response(JSON.stringify({access_token, expires_in, refresh_token}));
  } catch (ex) {
    console.error(ex);
    return new Response(`Internal Error: ${ex}`, {status: 500});
  }
}

export async function refreshHandler(path: string[], request: Request, env: Env) {
  try {
    const body = JSON.parse(await readRequestBody(request));
    const tokenBody = new URLSearchParams({
      client_id: env.VITE_CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: body.refresh_token,
    });
    console.log(tokenBody)
    const response = await fetch(`${env.VITE_DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: requestHeaders(env, {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: tokenBody,
    });
    // return new Response(`Internal Error: ${response}`, {status: 500});
    if (response.status != 200) {
      console.log(tokenBody)
      return response;
    }

    const {access_token, expires_in, refresh_token} = await response.json<IGetOAuthToken>();

    return new Response(JSON.stringify({access_token, expires_in, refresh_token}));
  } catch (ex) {
    console.error(ex);
    return new Response(`Internal Error: ${ex}`, {status: 500});
  }
}
