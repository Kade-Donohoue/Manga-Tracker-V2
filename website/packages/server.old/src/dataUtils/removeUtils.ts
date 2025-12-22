import { Env } from '../types';

export async function forgetUser(authId: string, env: Env) {
  try {
    const results = await env.DB.prepare('DELETE FROM users WHERE userID = ?').bind(authId).run();

    if (!results.success)
      return new Response(JSON.stringify({ message: 'Failed to Delete User!' }), { status: 500 });
    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occurred' }), { status: 500 });
  }
}

export async function deleteUserManga(authId: string, mangaId: string, env: Env) {
  try {
    const results = await env.DB.prepare('DELETE FROM userData WHERE userID = ? AND mangaId = ?')
      .bind(authId, mangaId)
      .run();

    if (!results.success)
      return new Response(JSON.stringify({ message: 'Failed to Remove Manga!' }), { status: 500 });
    return new Response(JSON.stringify({ message: 'Success', data: authId + mangaId }), {
      status: 200,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occurred' }), { status: 500 });
  }
}
