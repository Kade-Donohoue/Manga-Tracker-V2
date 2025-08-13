import { Env, addMangaSchema } from '../../types';
import { existingManga, saveManga } from '../../dataUtils/addUtils';
import { zodParse } from '../../utils';
import { z } from 'zod';

const addExistingSchema = z.object({
  mangaId: z.string().uuid(),
  index: z.number(),
  currentChap: z.string(),
  userCat: z.string(),
});

export default async function addHandler(
  path: string[],
  request: Request,
  env: Env,
  userId: string
) {
  switch (path[2]) {
    case 'addManga': {
      const body = await zodParse(request, addMangaSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await saveManga(userId, body.urls, body.userCat, env);
    }
    case 'existingManga': {
      const body = await zodParse(request, addExistingSchema);
      if (body instanceof Response) return body; // returns zod errors

      return await existingManga(
        userId,
        body.mangaId,
        body.index,
        body.userCat,
        body.currentChap,
        env
      );
    }
  }
}
