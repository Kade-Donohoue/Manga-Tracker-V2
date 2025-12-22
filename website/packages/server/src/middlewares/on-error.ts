import type { ErrorHandler } from 'hono';
import type { StatusCode, ContentfulStatusCode } from 'hono/utils/http-status';

const onError: ErrorHandler = (err, c) => {
  if (err instanceof Response) {
    return err;
  }

  const rawStatus =
    typeof (err as any).statusCode === 'number'
      ? (err as any).statusCode
      : typeof (err as any).status === 'number'
      ? (err as any).status
      : 500;

  const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;

  // eslint-disable-next-line node/prefer-global/process
  const env = c.env?.NODE_ENV;
  console.error(err);
  return c.json(
    {
      message: err.message,

      stack: env === 'production' ? undefined : err.stack,
    },
    status
  );
};

export default onError;
