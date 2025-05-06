import { z, ZodSchema } from 'zod';
import {Env} from './types';
import { createClerkClient } from '@clerk/backend'

/**
 * Validates user requests
 * @param path Requests path
 * @param req Request to validate
 * @param env environment
 * @param protectedAction function to call and passes path, req, env, userId(from authentication)
 * @returns protectedAction
 */
export async function verifyUserAuth(path: string[], req: Request, env: Env, protectedAction: (path: string[], req: Request, env: Env, userId: string) => any) {

  const clerkClient = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
  })

  const authState = await clerkClient.authenticateRequest(req, {
    authorizedParties: [env.VITE_CLIENT_URL, env.VITE_SERVER_URL, 'kd://callback', 'http://localhost:3000'],
  })
  console.log(authState)

  if (!authState.isSignedIn) {
    return new Response(JSON.stringify({message: authState.message, reason: authState.reason}), {status: 401})
  }

  const { userId } = authState.toAuth(); 
  console.log(userId)

  return protectedAction(path, req, env, userId)
}

/**
 * Validates server requests against env server password
 * @param path Requests path
 * @param req Request to validate
 * @param env environment
 * @param protectedAction function to call and passes path, req, env, userId(from headers)
 * @returns protectedAction
 */
export async function validateServerAuth(path: string[], req: Request, env: Env, protectedAction: (path: string[], req: Request, env: Env, userId: string) => any) {
  const userId = req.headers.get("userId") || ''
  if (req.headers.get("pass") === env.SERVER_PASSWORD) return protectedAction(path, req, env, userId)

  return new Response(JSON.stringify({Message: "Unauthorized"}), {status:401})
}

/**
 * Validates index is within array length
 * @param index Index to validate
 * @param listLength Length of list
 * @returns index or last index of array
 */
export function verifyIndexRange(index:number, listLength:number) {
  if (index < 0 ) return 0
  if (index < listLength) return index
  return listLength-1
}

/**
 * Parses request with zod schema
 * @param request Client Request
 * @param schema Zod Schema to parse request with
 * @returns parsed body based on provided schema
 */
export async function zodParse<T extends ZodSchema<any>>( request: Request, schema: T): Promise<z.infer<T> | Response> {
  try {
    const json = await request.json();
    const result = schema.safeParse(json);
  
    if (result.success) {
      return result.data;
    } else {
      console.error("Zod validation failed:", result.error.format());
      return new Response(
        JSON.stringify({
          message: "Validation error",
          issues: result.error.issues,
        }),
        { status: 400 }
      );
    }
  } catch (err) {
    console.log(err)
    return new Response(JSON.stringify({message: 'Bad Request, unable to parse', err: err}), { status: 400 });
  }
}
