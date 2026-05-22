export type Message =
  | {
      type: 'CHAPTER_REACHED';
      payload: {
        url: string;
        timeSpent: number;
        mangaData: {
          mangaId: string;
          currentIndex: number;
          currentChap: string;
          slugList: string[];
        };
        newIndex: number;
      };
    }
  | {
      type: 'CHECK_TRACKING';
      payload: {
        sourceId: string;
        siteName: string;
      };
    }
  | {
      type: 'FETCH_CATEGORIES';
      payload: {};
    }
  | {
      type: 'ADD_TRACKING';
      payload: {
        sourceId: string;
        siteName: string;
        url: string;
        currentPage: number;
        totalPages: number;
        title?: string;
        userCat?: string;
      };
    };
