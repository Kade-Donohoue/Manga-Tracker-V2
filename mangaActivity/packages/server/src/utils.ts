import { SetConfigResponse } from '@discord/embedded-app-sdk/output/schema/responses';
import {Env, user} from './types';

/**
 * readRequestBody reads in the incoming request body
 * Use await readRequestBody(..) in an async function to get the string
 * @param {Request} request the incoming request to read from
 */
export async function readRequestBody(request: Request) {
  const {headers} = request;
  const contentType = headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return JSON.stringify(await request.json());
  } else if (contentType.includes('application/text')) {
    return request.text();
  } else if (contentType.includes('text/html')) {
    return request.text();
  } else if (contentType.includes('form')) {
    const formData = await request.formData();
    const body: Record<string, any> = {};
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    return JSON.stringify(body);
  } else {
    // Perhaps some other type of data was submitted in the form
    // like an image, or some other binary data.
    return 'a file';
  }
}

export const hasFlag = (currentFlags: number, flag: number): boolean => (currentFlags & flag) > 0;

export function requestHeaders(env: Env, customHeaders: Record<string, string> = {}): Headers {
  const headers = new Headers();

  // for some environments (namely, staging) we use cloudflare service tokens
  // (https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/)
  // to bypass cloudflare access
  if (env.CF_ACCESS_CLIENT_ID != null) {
    headers.set('CF-Access-Client-Id', env.CF_ACCESS_CLIENT_ID);
  }
  if (env.CF_ACCESS_CLIENT_SECRET != null) {
    headers.set('CF-Access-Client-Secret', env.CF_ACCESS_CLIENT_SECRET);
  }

  // assumes using bot token for auth by default
  headers.set('Authorization', `Bot ${env.BOT_TOKEN}`);

  Object.entries(customHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
}

/**
 * Validates user or server
 * @param access_token User Access token or server password
 * @param userId provided user id
 * @param env environment
 * @param serverOnly when true token must match server password 
 * @returns userId or new error response
 */
export async function verifyUserAuth(access_token:string|null, userId:string|null, env:Env, serverOnly = false) {

  //If no access token provided return error response
  if (!access_token) return new Response(JSON.stringify({message: "No Access Token"}), {status:401}) 

  //if access token matches trust provided user id
  if (access_token == env.SERVER_PASSWORD) return userId

  //If onlyServer and token doesn't match return error response
  if (serverOnly) return new Response(JSON.stringify({message: "401: Unauthorized"}), {status:401}) 

  const response:any = await fetch(`${env.VITE_DISCORD_API_BASE}/users/@me`, {
    method: 'GET',
    headers: {Authorization: `Bearer ${access_token}`},
  })

  //if user is unauthorized by discord return discord response
  if (!response.ok) return response
  
  const auth:user = await response.json()
  return auth.id
}

export function verifyIndexRange(index:number, listLength:number) {
  if (index < 0 ) return 0
  if (index < listLength) return index
  return index-1
}