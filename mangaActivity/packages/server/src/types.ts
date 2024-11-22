export interface Env {
  ENVIRONMENT: 'dev' | 'staging' | 'production';
  VITE_CLIENT_ID: string;
  CLIENT_SECRET: string;
  BOT_TOKEN: string;
  VITE_DISCORD_API_BASE: string;
  VITE_SERVER_URL: string,
  VITE_CLIENT_URL: string,
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  DB: D1Database;
  IMG: R2Bucket;
  PUPPETEER_SERVER: string;
  SERVER_PASSWORD: string
}

export interface IGetOAuthToken {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

export enum SKUAccessTypes {
  FULL = 1,
  EARLY_ACCESS = 2,
  VIP_ACCESS = 3,
}

export const SKUFlags = {
  AVAILABLE: 1 << 2,
};

export enum EntitlementTypes {
  PURCHASE = 1,
  PREMIUM_SUBSCRIPTION = 2,
  DEVELOPER_GIFT = 3,
  TEST_MODE_PURCHASE = 4,
  FREE_PURCHASE = 5,
  USER_GIFT = 6,
  PREMIUM_PURCHASE = 7,
  APPLICATION_SUBSCRIPTION = 8,
}

export interface IGetSKUs {
  id: string;
  type: number;
  dependent_sku_id: string | null;
  application_id: string;
  access_type: SKUAccessTypes;
  name: string;
  slug: string;
  flags: number;
  release_date: string | null;
  price: {
    amount: number;
    currency: string;
  };
}

export interface IGetEntitlements {
  user_id: string;
  sku_id: string;
  application_id: string;
  id: string;
  type: number;
  consumed: boolean;
  payment: {
    id: string;
    currency: string;
    amount: number;
    tax: number;
    tax_inclusive: boolean;
  };
}

export interface user {
	"id": string,
	"username": string,
	"avatar": string,
	"discriminator": string,
	"public_flags": number,
	"flags": number,
	"banner": string,
	"accent_color": number,
	"global_name": string,
	"avatar_decoration_data": string,
	"banner_color": string,
	"clan": string,
	"mfa_enabled": boolean,
	"locale": string,
	"premium_type": number
}

export interface mangaDetails {
  mangaName:string,
  mangaId:string,
  urlList: string|string[],
  chapterTextList: string|string[], 
  updateTime: string,
  currentIndex: number,
  userCat: string,
  interactTime: number
}

export interface userDataRow {
  "mangaId": string,
  "userID": string,
  "mangaName": string,
  "currentIndex": number,
  "userCat": string,
  "interactTime": number
}

export interface mangaDataRowReturn {
  "mangaId": string,
  "mangaName": string,
  "urlList": string,
  "chapterTextList": string, 
  "updateTime": string
}

export interface mangaDataRowProcessed {
  "mangaId": string,
  "mangaName": string,
  "urlList": string[],
  "chapterTextList": string[], 
  "updateTime": string
}

export interface mangaReturn { 
  "mangaName": string,
  "chapterUrlList": string,
  "chapterTextList": string,
  "currentIndex": number,
  "iconBuffer": {
    "type": string,
    "data": number[]
  }
}

export interface updateData {
  "mangaName": string,
  "chapterUrlList": string,
  "chapterTextList": string,
  "currentIndex": string,
  "iconBuffer": {
    "type": string,
    "data": number[]
  }|null,
  "mangaId": string
}