export type fetchData = {
  mangaName: string;
  urlBase: string;
  slugList: string;
  chapterTextList: string;
  currentIndex: number;
  images: { image: Buffer<ArrayBufferLike>; index: number }[];
  specialFetchData: any;
  sourceId: string;
};

export type dataType = {
  type: string;
  url: string;
  mangaId: string;
  getIcon: boolean;
  update: boolean;
  length: number;
  oldSlugList: string;
  batchId: number;
  specialFetchData: any;
};

export type updateCollector = {
  batchId: number;
  batchData: {
    completedCount: number;
    failedCount: number;
    newChapterCount: number;
    batchLength: number;
    newData: {
      mangaName: string;
      urlBase: string;
      slugList: string;
      chapterTextList: string;
      currentIndex: number;
      images: { image: Buffer<ArrayBufferLike>; index: number }[];
      mangaId: string;
      newChapterCount: number;
      specialFetchData: any;
      sourceId: string;
    }[];
  };
};

export type mangaUrlCheck =
  | {
      success: true;
      value: string;
    }
  | {
      success: false;
      value: string;
      statusCode: number;
    };

export const getOpts = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        urls: { type: 'array' },
        pass: { type: 'string' },
      },
      required: ['urls', 'pass'],
    },
  },
};

export const checkOpts = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        fetchIds: { type: 'array' },
        pass: { type: 'string' },
      },
      required: ['fetchIds', 'pass'],
    },
  },
};

export interface SiteQueue {
  name: string;
  enabled: boolean;
  check(url: string): CheckResult;
  queue: import('bullmq').Queue;
  start: () => void;
}

export type CheckResult =
  | { ok: true; stage: number }
  | { ok: false; stage: number; reason: string };

export type oldMangaData = {
  mangaId: string;
  urlBase: string;
  slugList: string;
  mangaName: string;
  coverIndexes: number[];
  maxSavedAt: string;
  specialFetchData: any;
};

export type MangaQueueInsertResult = {
  batchId: string;
  enqueued: { fetchId: string; url: string }[];
  rejected: siteReject[];
};

export type siteReject = { reason: string; url: string };

export type SiteResolveResult =
  | { ok: true; site: SiteQueue }
  | { ok: false; error: { url: string; reason: string } };

export type PendingSave = {
  fetchId: string;
  data: Omit<fetchData, 'images'>;
  images: fetchData['images'];
};
