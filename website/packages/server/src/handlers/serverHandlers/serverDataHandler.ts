import { fixCurrentChaps, getAllManga, updateManga } from '../../dataUtils/serverUtils';
import { z } from 'zod'
import {Env, updateData} from '../../types';
import { zodParse } from '../../utils';

const updateMangaSchema = z.object({
    newData: updateData,
    amountNewChapters: z.number(),
    expiresAt: z.number()
});

export default async function dataHandler(path: string[], request: Request, env: Env, userId: string) {
    console.log(path[1])
    switch (path[1]) {
        case 'getAllManga':
            return await getAllManga(env)
        case 'updateManga': 
            const body = await zodParse(request, updateMangaSchema)
            if (body instanceof Response) return body // returns zod errors

            return await updateManga(body.newData, body.amountNewChapters, body.expiresAt, env);
        case 'fixCurrentChaps':
                return await fixCurrentChaps(env)
        default:
            return new Response('Not found', {status: 404}); 
    }
}
