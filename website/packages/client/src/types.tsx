export interface mangaInfo {
  userInfo: {
    "userID": string,
    "mangaName": string,
    "mangaId": string,
    "currentIndex": number,
    "userCat": string,
    "interactTime": number
  }[],
  mangaData: {
    "mangaId": string,
    "mangaName": string,
    "urlList": string[],
    "chapterTextList": string[], 
    "updateTime": string
  }[]
}

export interface mangaDetails {
  mangaName:string,
  mangaId:string,
  urlBase:string,
  slugList: string[],
  chapterTextList: string[], 
  updateTime: string,
  currentIndex: number,
  userCat: string,
  interactTime: number
}

export interface dropdownOption {
  "value":string, 
  "label": string,
  "color"?: string
}

export type friend = {
  id: string; 
  userID: string; 
  userName: string; 
  imageURl: string; 
  createdAt: string; 
  respondedAt: string; 
};
