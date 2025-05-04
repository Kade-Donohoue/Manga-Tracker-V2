import { getAllManga, updateManga } from '../../dataUtils/serverUtils';
import { z } from 'zod'
import {Env, updateData} from '../../types';

const updateMangaSchema = z.object({
    newData: updateData,
    amountNewChapters: z.number(),
    expiresAt: z.number()
});

export default async function dataHandler(path: string[], request: Request, env: Env, userId: string) {
    let body:unknown = null
    if (request.method !== 'GET' && request.headers.get('Content-Type') === 'application/json') {
        try {
            body = await request.json();
        } catch {
            return new Response('Invalid JSON body.', { status: 400 });
        }
    }
    
    console.log(path[1])
    switch (path[1]) {
        
        case 'getAllManga':
            return await getAllManga(env)

        case 'updateManga': 
            const result = updateMangaSchema.safeParse(body);
            if (!result.success) {
                return new Response(JSON.stringify(result.error.format()), { status: 400 });
            }
            return await updateManga(result.data.newData, result.data.amountNewChapters, result.data.expiresAt, env);
            
        default:
            return new Response('Not found', {status: 404}); 
    }
}
