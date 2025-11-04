import { Env, friendDetailsSchema } from '../types';

export async function sendRequest(senderId: string, userName: string, env: Env) {
  const receiverId = await getUserIdByName(userName, env);

  if (receiverId instanceof Response) return receiverId;

  console.log({ endpoint: 'friends/sendRequest', userId: senderId, receiverId: receiverId });
  const existing = await env.DB.prepare(
    `SELECT 1 FROM friends WHERE ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)) AND status != 'declined'  LIMIT 1`
  )
    .bind(senderId, receiverId, receiverId, senderId)
    .first();
  console.log(existing);
  if (existing) {
    console.log({ message: 'Friendship alread Exists!' });
    return new Response(
      JSON.stringify({ message: 'Friend request Pending or friendship already exists.' }),
      { status: 400 }
    );
  }

  const results = await env.DB.prepare(
    'INSERT INTO friends (senderId, receiverId) VALUES (?, ?) ON CONFLICT(senderId, receiverId) DO UPDATE SET senderId = excluded.senderId, receiverId = excluded.receiverId, status = "pending"'
  )
    .bind(senderId, receiverId)
    .run();

  console.log(results);
  if (!results.success)
    return new Response(JSON.stringify({ message: 'Unable To Send Request, Server DB Error.' }), {
      status: 500,
    });
  return new Response(JSON.stringify({ message: 'Request Sent' }), { status: 200 });
}

export async function getFriends(userId: string, env: Env) {
  const results = await env.DB.prepare(
    `
    SELECT f.id, u.userID, u.userName, u.imageURl, u.createdAt, f.respondedAt, f.sentAt, COALESCE(ud.dataCount, 0) AS mangaCount, COALESCE(ud.chapterSum, 0) AS chaptersRead
    FROM friends f
    JOIN users u ON (
      (f.senderId = ? AND u.userID = f.receiverId)
      OR
      (f.receiverId = ? AND u.userID = f.senderId)
    )
    LEFT JOIN (
      SELECT 
        d.userID, 
        COUNT(*) AS dataCount,
        SUM(CAST(FLOOR(currentChap) AS INTEGER)) AS chapterSum
      FROM userData d
      JOIN userCategories c on d.userCat = c.value AND d.userID = c.userID
      WHERE (c.public = 1 AND c.stats = 1)
      GROUP BY d.userID
    ) ud ON ud.userId = u.userID
    WHERE (f.senderId = ? OR f.receiverId = ?)
      AND f.status = 'accepted';
  `
  )
    .bind(userId, userId, userId, userId)
    .all();

  console.log(results);

  if (!results.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  return new Response(JSON.stringify({ message: 'Success!', data: results.results }), {
    status: 200,
  });
}

export async function getRecievedRequests(userId: string, env: Env) {
  const results = await env.DB.prepare(
    `
    SELECT f.id, u.userID, u.userName, u.imageURl, u.createdAt, f.respondedAt, f.sentAt
    FROM friends f
    JOIN users u ON (
      (f.receiverId = ? AND u.userID = f.senderId)
    )
    WHERE (f.receiverId = ?)
      AND f.status = 'pending';
  `
  )
    .bind(userId, userId)
    .all();

  if (!results.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  return new Response(JSON.stringify({ message: 'Success!', data: results.results }), {
    status: 200,
  });
}

export async function getSentRequests(userId: string, env: Env) {
  const results = await env.DB.prepare(
    `
    SELECT f.id, u.userID, u.userName, u.imageURl, u.createdAt, f.respondedAt, f.sentAt
    FROM friends f
    JOIN users u ON (
      (f.senderId = ? AND u.userID = f.receiverId)
    )
    WHERE (f.senderId = ?)
      AND f.status = 'pending';
  `
  )
    .bind(userId, userId)
    .all();

  if (!results.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  return new Response(JSON.stringify({ message: 'Success!', data: results.results }), {
    status: 200,
  });
}

export async function updateRequestStatus(
  userId: string,
  requestId: number,
  newStatus: String,
  env: Env
) {
  const results = await env.DB.prepare(
    'UPDATE friends SET status = ?, respondedAt = CURRENT_TIMESTAMP WHERE id = ? AND receiverId = ? '
  )
    .bind(newStatus, requestId, userId)
    .run();

  if (!results.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  return new Response(JSON.stringify({ message: 'Request Updated!' }), { status: 200 });
}

export async function cancelRequest(userId: string, requestId: number, env: Env) {
  const results = await env.DB.prepare('DELETE FROM friends WHERE id = ? AND senderId = ?')
    .bind(requestId, userId)
    .run();

  if (!results.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  return new Response(JSON.stringify({ message: 'Request Updated!' }), { status: 200 });
}

export async function getUserId(userName: string, env: Env) {
  const userId = await getUserIdByName(userName, env);

  if (userId instanceof Response) return userId;
  return new Response(JSON.stringify({ message: 'Success!', userId: userId }), { status: 200 });
}

async function getUserIdByName(userName: string, env: Env): Promise<string | Response> {
  const results = await env.DB.prepare('SELECT userID from users WHERE userName = ? LIMIT 1')
    .bind(userName.toLowerCase())
    .first();

  if (!results) return new Response(JSON.stringify({ message: 'No User Found!' }), { status: 500 });
  return results.userID as string;
}

export async function getRequestCount(userId: string, env: Env) {
  const results = await env.DB.prepare(
    `SELECT
    (SELECT COUNT(*) FROM friends WHERE (receiverId = ? OR senderId = ?) AND status = 'accepted') AS friendCount,
    (SELECT COUNT(*) FROM friends WHERE receiverId = ? AND status = 'pending') AS incomingCount,
    (SELECT COUNT(*) FROM friends WHERE senderId = ? AND status = 'pending') AS outgoingCount`
  )
    .bind(userId, userId, userId, userId)
    .all();

  if (!results.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  return new Response(JSON.stringify({ message: 'Success!', data: results.results[0] }), {
    status: 200,
  });
}

export async function removeFriend(userId: string, requestId: number, env: Env) {
  const results = await env.DB.prepare(
    'DELETE FROM friends WHERE id = ? AND (senderId = ? OR receiverId = ?)'
  )
    .bind(requestId, userId, userId)
    .run();

  if (!results.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  return new Response(JSON.stringify({ message: 'Friendship Ended!' }), { status: 200 });
}

export async function recomendManga(userId: string, receiverId: string, mangaId: string, env: Env) {
  const results = await env.DB.prepare(
    'INSERT OR IGNORE INTO recommendations (recommenderId, receiverId, mangaId) VALUES (?, ?, ?)'
  )
    .bind(userId, receiverId, mangaId)
    .run();

  if (results.meta.changes === 0) {
    console.log({ message: 'recommendation already exists' });
    return new Response(JSON.stringify({ message: 'Recommendation already Sent!' }), {
      status: 409,
    });
  }

  return new Response(JSON.stringify({ message: 'Recommendation Sent!' }), { status: 200 });
}

export async function getFriendDetails(userId: string, friendId: string, env: Env) {
  const receivedStmt = env.DB.prepare(
    `
      SELECT r.id, r.mangaId, r.status, m.mangaName, m.urlBase, m.slugList, m.chapterTextList from recommendations r JOIN mangaData m ON m.mangaId = r.mangaId WHERE receiverId = ? AND r.recommenderId = ? AND r.status = 'pending'
    `
  ).bind(userId, friendId);

  const sentStmt = env.DB.prepare(
    `
      SELECT r.id, r.mangaId, r.status, m.mangaName, m.urlBase, m.slugList, m.chapterTextList from recommendations r JOIN mangaData m ON m.mangaId = r.mangaId WHERE receiverId = ? AND r.recommenderId = ? AND NOT status = 'canceled' 
    `
  ).bind(friendId, userId);

  const friendStmt = env.DB.prepare(
    `
      WITH dailySums AS (
        SELECT DATE(timestamp) AS day, SUM(value) AS totalPerDay
        FROM userStats 
        WHERE userID = ? AND timestamp > datetime('now', '-31 days')
        GROUP BY day
      )

      SELECT

        -- Total chapters read
        (SELECT SUM(
            CASE WHEN m.useAltStatCalc = 1 THEN FLOOR(u.currentIndex) + 1 ELSE FLOOR(u.currentChap) END
        )
        FROM userData u
        JOIN mangaData m ON u.mangaId = m.mangaId
        JOIN userCategories c ON u.userCat = c.value AND u.userId = c.userId
        WHERE u.userId = ? AND c.stats = 1) AS readChapters,

        -- Total chapters tracked
        (SELECT SUM(
            CASE WHEN m.useAltStatCalc = 1 THEN LENGTH(m.latestChapterText) - LENGTH(REPLACE(m.latestChapterText, ',', '')) + 1 ELSE FLOOR(m.latestChapterText) END
        )
        FROM userData u
        JOIN mangaData m ON u.mangaId = m.mangaId
        JOIN userCategories c ON u.userCat = c.value AND u.userId = c.userId
        WHERE u.userId = ?) AS trackedChapters,

        -- Chapters read this month
        (SELECT COALESCE(SUM(value), 0)
        FROM userStats
        WHERE type = 'chapsRead' AND timestamp > datetime('now', '-30 days') AND userID = ?) AS readThisMonth,

        -- Average per day for the last 30 days
        (SELECT COALESCE(AVG(totalPerDay), 0)
        FROM dailySums
        WHERE day >= DATE('now','-30 days')) AS averagePerDay,

        -- Average per day for the prior 30-day period
        (SELECT COALESCE(AVG(totalPerDay), 0)
        FROM dailySums
        WHERE day >= DATE('now','-31 days') AND day < DATE('now')) AS priorAveragePerDay

      `
  ).bind(friendId, friendId, friendId, friendId);

  const [receivedRes, sentRes, friendRes] = await env.DB.batch([
    receivedStmt,
    sentStmt,
    friendStmt,
  ]);

  if (!receivedRes.success || !friendRes.success || !sentRes.success)
    return new Response(
      JSON.stringify({ message: 'DataBase Error, Try Again Later or contact admin!.' }),
      { status: 500 }
    );
  console.log({
    recomendations: { received: receivedRes.results, sent: sentRes.results },
    stats: friendRes.results[0],
  });
  let friendDetails = friendDetailsSchema.safeParse({
    recomendations: { received: receivedRes.results, sent: sentRes.results },
    stats: friendRes.results[0],
  });

  if (!friendDetails.success) {
    return new Response(
      JSON.stringify({
        message: `Internal Server Error!`,
        errors: friendDetails.error.errors,
      }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ message: 'Success!', data: friendDetails.data }), {
    status: 200,
  });
}

export async function updateRecomendedStatus(
  userId: string,
  recId: number,
  newStatus: string,
  env: Env
) {
  await env.DB.prepare(
    `UPDATE recommendations SET status = ? WHERE (receiverId = ? OR recommenderId = ?) AND id = ?`
  )
    .bind(newStatus, userId, userId, recId)
    .run();

  return new Response(JSON.stringify({ message: 'Success!' }), {
    status: 200,
  });
}
