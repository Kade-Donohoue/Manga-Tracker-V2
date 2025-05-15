import { Env } from "../types";

export async function sendRequest(senderId:string, userName:string, env:Env) {

  const receiverId = await getUserIdByName(userName, env)

  if (receiverId instanceof Response) return receiverId

  console.log({endpoint: 'friends/sendRequest', userId: senderId, receiverId: receiverId})
  const existing = await env.DB.prepare(`SELECT 1 FROM friends WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) LIMIT 1`)
    .bind(senderId, receiverId, receiverId, senderId)
    .first();
  console.log(existing)
  if (existing) {
    console.log({message: 'Friendship alread Exists!'})
    return new Response(JSON.stringify({ message: 'Friend request Pending or friendship already exists.' }), { status: 400 });
  }
  
  const results = await env.DB.prepare('INSERT INTO friends (senderId, receiverId) VALUES (?, ?)')
    .bind(senderId, receiverId)
    .run();

    console.log(results)
  if (!results.success) return new Response(JSON.stringify({message: 'Unable To Send Request, Server DB Error.', results: results}), {status:500});
  return new Response(JSON.stringify({message: 'Request Sent'}), {status: 200});
}

export async function getFriends(userId:string, env:Env) {
  const results = await env.DB.prepare(`
    SELECT f.id, u.userID, u.userName, u.imageURl, u.createdAt, f.respondedAt
    FROM friends f
    JOIN users u ON (
      (f.senderId = ? AND u.userID = f.receiverId)
      OR
      (f.receiverId = ? AND u.userID = f.senderId)
    )
    WHERE (f.senderId = ? OR f.receiverId = ?)
      AND f.status = 'accepted';
  `).bind(userId, userId, userId, userId).all();

  console.log(results)
  
  if (!results.success) return new Response(JSON.stringify({message: 'DataBase Error, Try Again Later or contact admin!.', results: results}), {status:500});
  return new Response(JSON.stringify({message: 'Success!', results: results.results}), {status: 200});
}

export async function getRecievedRequests(userId:string, env:Env) {
  const results = await env.DB.prepare(`
    SELECT f.id, u.userID, u.userName, u.imageURl, u.createdAt, f.respondedAt
    FROM friends f
    JOIN users u ON (
      (f.receiverId = ? AND u.userID = f.senderId)
    )
    WHERE (f.receiverId = ?)
      AND f.status = 'pending';
  `).bind(userId, userId).all();
  
  if (!results.success) return new Response(JSON.stringify({message: 'DataBase Error, Try Again Later or contact admin!.', results: results}), {status:500});
  return new Response(JSON.stringify({message: 'Success!', results: results.results}), {status: 200});
}

export async function getSentRequests(userId:string, env:Env) {
  const results = await env.DB.prepare(`
    SELECT f.id, u.userID, u.userName, u.imageURl, u.createdAt, f.respondedAt
    FROM friends f
    JOIN users u ON (
      (f.senderId = ? AND u.userID = f.receiverId)
    )
    WHERE (f.senderId = ?)
      AND f.status = 'pending';
  `).bind(userId, userId).all();
  
  if (!results.success) return new Response(JSON.stringify({message: 'DataBase Error, Try Again Later or contact admin!.', results: results}), {status:500});
  return new Response(JSON.stringify({message: 'Success!', results: results.results}), {status: 200});
}

export async function updateRequestStatus(userId:string, requestId:number, newStatus:String, env:Env) {

  const results = await env.DB.prepare('UPDATE friends WHERE id = ? AND receiverId = ? SET status = ? respondedAt = CURRENT_TIMESTAMP')
    .bind(requestId, userId, newStatus)
    .run()

  if (!results.success) return new Response(JSON.stringify({message: 'DataBase Error, Try Again Later or contact admin!.', results: results}), {status:500});
  return new Response(JSON.stringify({message: 'Request Updated!'}), {status: 200});
}

export async function cancelRequest(userId:string, requestId:number, env:Env) {

  const results = await env.DB.prepare('DELETE FROM friends WHERE id = ? AND senderId = ?')
    .bind(requestId, userId)
    .run()

  if (!results.success) return new Response(JSON.stringify({message: 'DataBase Error, Try Again Later or contact admin!.', results: results}), {status:500});
  return new Response(JSON.stringify({message: 'Request Updated!'}), {status: 200});
}

export async function getUserId(userName:string, env:Env) {
  
  const userId = await getUserIdByName(userName, env)

  if (userId instanceof Response) return userId
  return new Response(JSON.stringify({message: 'Success!', userId: userId}), {status: 200});
}

async function getUserIdByName(userName:string, env:Env):Promise<string|Response> {
  const results = await env.DB.prepare('SELECT userID from users WHERE userName = ? LIMIT 1')
    .bind(userName)
    .first()

  if (!results) return new Response(JSON.stringify({message: 'No User Found!', results: results}), {status:500});
  return results.userID as string
}