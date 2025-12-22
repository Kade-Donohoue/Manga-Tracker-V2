import { z } from 'zod';

export const updateUserCategoriesSchema = z.object({
  newCatList: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      color: z.string().default('#fff'),
      stats: z.boolean().default(true),
      public: z.boolean().default(false),
      position: z.number().int().min(0),
    })
  ),
});

export const updateMangaIndexSchema = z.object({
  mangaId: z.string().min(1),
  newIndex: z.number().int().nonnegative(),
});

export const updateMangaTitleSchema = z.object({
  mangaId: z.string().min(1),
  newTitle: z.string().min(1),
});

export const updateMangaCategorySchema = z.object({
  mangaId: z.string().min(1),
  newCat: z.string().min(1),
});

export const updateMangaTimeSchema = z.object({
  mangaId: z.string().min(1),
  newTime: z.number().int().min(0),
});

export const sendFriendRequestSchema = z.object({
  userName: z.string(),
});

export const updateRequestStatusSchema = z.object({
  requestId: z.number(),
  status: z.enum(['declined', 'accepted']),
});

export const recomendMangaSchema = z.object({
  mangaId: z.uuid(),
  friendId: z.string(),
});

export const getFriendDetailsSchema = z.object({
  friendId: z.string(),
});

export const getUserIdSchema = z.object({
  userName: z.string().min(1),
});

export const updateRecomendedStatusSchema = z.object({
  requestId: z.number(),
  newStatus: z.enum(['pending', 'accepted', 'declined']),
});

export const friendBasicSchema = z.object({
  requestId: z.number(),
});

const friendRecomendationsSchema = z
  .object({
    id: z.number(),
    mangaName: z.string().min(1),
    status: z.string(),
    mangaId: z.uuid(),
    urlBase: z.string(),
    slugList: z
      .union([z.string(), z.array(z.string())])
      .transform((val) => (typeof val === 'string' ? val.split(',') : val)),
    chapterTextList: z
      .union([z.string(), z.array(z.string())])
      .transform((val) => (typeof val === 'string' ? val.split(',') : val)),
  })
  .array();

export const friendDetailsSchema = z.object({
  recomendations: z.object({
    received: friendRecomendationsSchema,
    sent: friendRecomendationsSchema,
  }),
  stats: z.object({
    readChapters: z.number(),
    trackedChapters: z.number(),
    readThisMonth: z.number(),
    averagePerDay: z.number(),
  }),
});

export const addMangaSchema = z.object({
  urls: z.array(z.coerce.string()).min(1),
  userCat: z.coerce.string().min(1),
});

export const addStatusSchema = z.object({
  fetchIds: z.array(z.coerce.string()).min(1),
});

export const addRecomendedSchema = z.object({
  mangaId: z.uuid(),
  index: z.number(),
  currentChap: z.number(),
  userCat: z.string(),
});

const newMangaData = z.object({
  mangaName: z.string().min(1),
  urlBase: z.string(),
  slugList: z.string(),
  chapterTextList: z.string().transform((val) => val.replace(/-/g, '.')),
  currentIndex: z.coerce.number(),
  specialFetchData: z.any().nullable(),
  sourceId: z.string().min(1),
});

export const newMangaSchama = z.object({
  fetchId: z.string(),
  newMangaData: newMangaData,
});

export const saveImageSchema = z.object({
  img: z.any(),
  index: z.number(),
  mangaId: z.uuid(),
});

export const updateData = z.array(
  z.object({
    mangaName: z.string().min(1),
    mangaId: z.uuid(),
    urlBase: z.string(),
    slugList: z.string(),
    chapterTextList: z.string(),
    newChapterCount: z.coerce.number(),
    currentIndex: z.coerce.string(),
    specialFetchData: z.any().nullable(),
    sourceId: z.string().min(1),
  })
);

export const updateDataSchema = z.object({
  newData: updateData,
});
