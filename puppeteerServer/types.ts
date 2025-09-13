export type fetchData = {
  mangaName: string;
  urlBase: string;
  slugList: string;
  chapterTextList: string;
  currentIndex: number;
  iconBuffer: Buffer | null;
  newCoverImageIndex: number;
  specialFetchData: any;
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
      iconBuffer: Buffer;
      mangaId: string;
      newCoverImageIndex: number;
      newChapterCount: number;
      specialFetchData: any;
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
