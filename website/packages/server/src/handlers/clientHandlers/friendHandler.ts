import { Env, addMangaSchema } from '../../types';
import { saveManga } from '../../dataUtils/addUtils';
import { zodParse } from '../../utils';
import {
  cancelRequest,
  getFriendDetails,
  getFriends,
  getRecievedRequests,
  getRequestCount,
  getSentRequests,
  getUserId,
  updateRecomendedStatus,
  recomendManga,
  removeFriend,
  sendRequest,
  updateRequestStatus,
} from '../../dataUtils/friendUtils';
import { z } from 'zod';

const sendFriendRequestSchema = z.object({
  userName: z.string(),
});

const updateRequestStatusSchema = z.object({
  requestId: z.number(),
  status: z.enum(['declined', 'accepted']),
});

const cancelRequestStatusSchema = z.object({
  requestId: z.number(),
});

const recomendMangaSchema = z.object({
  mangaId: z.string().uuid(),
  friendId: z.string(),
});
const getFriendDetailsSchema = z.object({
  friendId: z.string(),
});

const getUserIdSchema = z.object({
  userName: z.string().min(1),
});

const updateRecomendedStatusSchema = z.object({
  recId: z.number(),
  newStatus: z.enum(['pending', 'ignored', 'canceled'])
})

export default async function friendHandler(
  path: string[],
  request: Request,
  env: Env,
  userId: string
) {
  switch (path[1]) {
    case 'sendRequest': {
      const body = await zodParse(request, sendFriendRequestSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await sendRequest(userId, body.userName, env);
    }
    case 'getFriends': {
      return await getFriends(userId, env);
    }
    case 'getRecieved': {
      return await getRecievedRequests(userId, env);
    }
    case 'getSent': {
      return await getSentRequests(userId, env);
    }
    case 'updateStatus': {
      const body = await zodParse(request, updateRequestStatusSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await updateRequestStatus(userId, body.requestId, body.status, env);
    }
    case 'cancel': {
      const body = await zodParse(request, cancelRequestStatusSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await cancelRequest(userId, body.requestId, env);
    }
    case 'getUserId': {
      const body = await zodParse(request, getUserIdSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await getUserId(body.userName, env);
    }
    case 'getCount': {
      return await getRequestCount(userId, env);
    }
    case 'remove': {
      const body = await zodParse(request, cancelRequestStatusSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await removeFriend(userId, body.requestId, env);
    }
    case 'recomendManga': {
      const body = await zodParse(request, recomendMangaSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await recomendManga(userId, body.friendId, body.mangaId, env);
    }
    case 'getFriendDetails': {
      const body = await zodParse(request, getFriendDetailsSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await getFriendDetails(userId, body.friendId, env);
    }
    case 'updateRecomendedStatus': {
      const body = await zodParse(request, updateRecomendedStatusSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await updateRecomendedStatus(userId, body.recId, body.newStatus, env);
    }
    default:
      return new Response('Not found', { status: 404 });
  }
}
