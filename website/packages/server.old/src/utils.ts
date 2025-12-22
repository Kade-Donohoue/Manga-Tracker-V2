import { z } from 'zod';
import { Env } from './types';

/**
 * Validates server requests against env server password
 * @param path Requests path
 * @param req Request to validate
 * @param env environment
 * @param protectedAction function to call and passes path, req, env, userId(from headers)
 * @returns protectedAction
 */
export async function validateServerAuth(
  path: string[],
  req: Request,
  env: Env,
  protectedAction: (path: string[], req: Request, env: Env, userId: string) => any
) {
  const userId = req.headers.get('userId') || '';
  if (req.headers.get('pass') === env.SERVER_PASSWORD)
    return protectedAction(path, req, env, userId);

  return new Response(JSON.stringify({ Message: 'Unauthorized' }), { status: 401 });
}

/**
 * Validates index is within array length
 * @param index Index to validate
 * @param listLength Length of list
 * @returns index or last index of array
 */
export function verifyIndexRange(index: number, listLength: number) {
  if (index < 0) return 0;
  if (index < listLength) return index;
  return listLength - 1;
}

/**
 * Parses request with zod schema
 * @param request Client Request
 * @param schema Zod Schema to parse request with
 * @returns parsed body based on provided schema
 */
export async function zodParse<T extends z.ZodType<unknown, any, any>>(
  request: Request,
  schema: T
): Promise<z.infer<T> | Response> {
  try {
    const json = await request.json();
    const result = schema.safeParse(json);

    if (result.success) {
      return result.data;
    } else {
      const tree = z.treeifyError(result.error);
      console.error({ 'Error Message': 'Zod validation failed', error: tree });
      return new Response(
        JSON.stringify({
          message: 'Validation error',
          issues: result.error.issues,
        }),
        { status: 400 }
      );
    }
  } catch (err) {
    console.log(err);
    return new Response(JSON.stringify({ message: 'Bad Request, unable to parse', err: err }), {
      status: 400,
    });
  }
}

/**
 * Extracts a numeric value from the first object in an array by a specified key.
 *
 * @template T - The key type, constrained to string.
 * @param res - An array of unknown objects to search.
 * @param key - The property name to extract from the first object in the array.
 * @param fallback - A default value to return if the key does not exist or the value is not a number (default is 0).
 * @returns The numeric value corresponding to the key in the first object, or the fallback if unavailable.
 *
 * @example
 * const data = [{ count: 5, name: 'Item' }];
 * const value = extractValue(data, 'count'); // returns 5
 *
 * const emptyData: any[] = [];
 * const value2 = extractValue(emptyData, 'count', 10); // returns 10
 */
export function extractValue<T extends string>(res: unknown[], key: T, fallback = 0): number {
  if (res && res.length && typeof (res[0] as any)[key] === 'number') {
    return (res[0] as Record<T, number>)[key];
  }
  return fallback;
}

export async function sendNotif(title: string, message: string, env: Env) {
  const webhookUrls = env.NOTIF_WEBHOOK_URLS.split(',');
  const results = await Promise.allSettled(
    webhookUrls.map((url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Server: ' + title,
          content: message,
        }),
      })
    )
  );
}
