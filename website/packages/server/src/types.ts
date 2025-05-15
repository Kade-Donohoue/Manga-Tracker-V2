import { number, object, z } from "zod";

export interface Env {
  ENVIRONMENT: 'dev' | 'staging' | 'production';
  VITE_CLIENT_ID: string;
  CLIENT_SECRET: string;
  BOT_TOKEN: string;
  VITE_DISCORD_API_BASE: string;
  VITE_SERVER_URL: string;
  VITE_CLIENT_URL: string;
  VITE_CLERK_PUBLISHABLE_KEY: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DB: D1Database;
  IMG: R2Bucket;
  KV: KVNamespace;
  PUPPETEER_SERVER: string;
  SERVER_PASSWORD: string;
  CLERK_SECRET_KEY: string;
}

export const mangaDataRow = z.object({
  mangaName: z.string().min(1),
  mangaId: z.string().uuid(),
  urlBase: z.string(),
  slugList: z.union([z.string(), z.array(z.string())]).transform((val => (typeof val === "string" ? val.split(","):val))),
  chapterTextList: z.union([z.string(), z.array(z.string())]).transform((val => (typeof val === "string" ? val.split(","):val))),
  updateTime: z.string(),
})

export const userDataRow = z.object({
  userId: z.string(),
  mangaId: z.string().uuid(),
  currentIndex: z.coerce.number().int().min(0),
  currentChap: z.coerce.number(),
  userCat: z.string(),
  interactTime: z.coerce.number().int().min(0),
})

export const mangaDetailsSchema = mangaDataRow.merge(z.object({
  currentIndex: z.coerce.number().int().min(0),
  currentChap: z.coerce.number(),
  userCat: z.string(),
  interactTime: z.coerce.number().int().min(0),
}))

export const statsDataRow = z.object({
  timestamp: z.string(),
  type: z.string(),
  stat_value: z.coerce.number().int()
})

export const settingsDataRow = z.object({
  userId: z.string(),
  categories: z.preprocess((val) => {
    if (typeof val === "string") { //if string parse into json. if fail return string causing validation error
      try {
        return JSON.parse(val);
      } catch {
        return val; 
      }
    }
    return val;
  }, z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  )),
})

export const updateData = z.array(z.object({
  mangaName: z.string().min(1),
  mangaId: z.string().uuid(),
  urlBase: z.string(),
  slugList: z.string(),
  chapterTextList: z.string(),
  currentIndex: z.coerce.string(),
  iconBuffer: z.object({
    type: z.literal("Buffer"),
    data: z.array(z.number().int().min(0).max(255)),
  }).nullable(),
}))

export type updateDataType = z.infer<typeof updateData>

export const newData = z.object({
  mangaName: z.string().min(1),
  urlBase: z.string(),
  slugList: z.string(),
  chapterTextList: z.string().transform((val) => val.replace(/-/g, ".")),
  currentIndex: z.coerce.number(),
  iconBuffer: z.object({
    type: z.literal("Buffer"),
    data: z.array(z.number().int().min(0).max(255)),
  }),
})

export type newDataType = z.infer<typeof newData>

const sortMethodSchema = z
  .string()
  .transform((val) => val.toLowerCase())
  .refine((val) =>
    ['manganame', /*'mangaid',*/ 'usercat', 'updatetime', 'interacttime', 'currentindex'].includes(val), {
    message: 'Invalid sort method',
  })
  .transform((val) => {
    const map: Record<string, string> = {
      manganame: 'mangaData.mangaName',
      // mangaid: 'userData.mangaId',
      usercat: 'userData.userCat',
      updatetime: 'mangaData.updateTime',
      interacttime: 'userData.interactTime',
      currentindex: 'userData.currentIndex',
    };
    return map[val];
})

export const getUnreadSchema = z.object({
  userCat: z.coerce.string(),
  sortMeth: sortMethodSchema,
  sortOrd: z.enum(['ASC', 'DESC']),
});

export type getUnreadType = z.infer<typeof getUnreadSchema>

export const mangaIdSchema = z.object({
  mangaId: z.coerce.string().uuid(),
});
var body = {"userCat":"", "urls":[]}
export type getMangaType = z.infer<typeof mangaIdSchema>


export const addMangaSchema = z.object({
  urls: z.coerce.string().array().min(1),
  userCat: z.coerce.string().min(1)
})

export const updateCurrentIndexSchema = z.object({
  newIndex: z.coerce.number().min(0),
  mangaId: z.coerce.string().uuid(),
  currentChap: z.coerce.number()
})

export const updateInteractTimeSchema = z.object({
  mangaId: z.coerce.string().uuid(),
  interactionTime: z.coerce.number().default(Date.now()),
})

export const changeMangaCatSchema = z.object({
  mangaId: z.coerce.string().uuid(),
  newCat: z.coerce.string(),
})

export const updateUserCategoriesSchema = z.object({
  newCatList: z.coerce.string(),
})

export interface mangaDataRowReturn {
  "mangaId": string,
  "mangaName": string,
  "urlBase": string,
  "slugList": string,
  "chapterTextList": string, 
  "updateTime": string
}

export interface mangaDataRowProcessed {
  "mangaId": string,
  "mangaName": string,
  "urlBase": string,
  "slugList": string[],
  "chapterTextList": string[], 
  "updateTime": string
}

export interface mangaReturn { 
  "mangaName": string,
  "urlBase": string,
  "slugList": string
  "chapterTextList": string,
  "currentIndex": number,
  "iconBuffer": {
    "type": string,
    "data": number[]
  }
}

export const clerkUserSchema = z.object({
  data: z.object({
    id: z.string(),
    username: z.string(),
    image_url: z.string().url(),
    created_at: z.number()
  }).passthrough(),
}).passthrough();