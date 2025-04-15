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

export interface mangaDetails {
  mangaName:string,
  mangaId:string,
  urlBase: string,
  slugList: string|string[],
  chapterTextList: string|string[], 
  updateTime: string,
  currentIndex: number,
  currentChap: number,
  userCat: string,
  interactTime: number
}

export interface userDataRow {
  "mangaId": string,
  "userID": string,
  "mangaName": string,
  "currentIndex": number,
  "currentChap": number,
  "userCat": string,
  "interactTime": number
}

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

// export interface updateData {
//   "mangaName": string,
//   "chapterUrlList": string,
//   "chapterTextList": string,
//   "currentIndex": string,
//   "iconBuffer": {
//     "type": string,
//     "data": number[]
//   }|null,
//   "mangaId": string
// }