export interface mangaInfo {
  userInfo: {
    userID: string;
    mangaName: string;
    mangaId: string;
    currentIndex: number;
    userCat: string;
    interactTime: number;
  }[];
  mangaData: {
    mangaId: string;
    mangaName: string;
    urlList: string[];
    chapterTextList: string[];
    updateTime: string;
  }[];
}

export interface mangaDetails {
  mangaName: string;
  mangaId: string;
  urlBase: string;
  slugList: string[];
  chapterTextList: string[];
  updateTime: string;
  currentIndex: number;
  userCat: string;
  interactTime: number;
  imageIndexes: number[];
  currentChap: number;
  sharedFriends: {
    userID: string;
    avatarUrl: string;
    userName: string;
  }[];
}

export interface dropdownOption {
  value: string;
  label: string;
  color?: string;
  stats?: boolean;
  public?: boolean;
  position?: number;
}

export interface categoryOption {
  value: string;
  label: string;
  color: string;
  stats: boolean;
  public: boolean;
  position: number;
}

export type friend = {
  id: number;
  userID: string;
  userName: string;
  imageURl: string;
  createdAt: string;
  respondedAt: string;
  sentAt: string;
  mangaCount: string;
  chaptersRead: string;
};
