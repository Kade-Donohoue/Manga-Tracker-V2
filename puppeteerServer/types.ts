export type fetchData = {
    "mangaName":string, 
    "urlBase":string, 
    "slugList":string,
    "chapterTextList":string, 
    "currentIndex":number, 
    "iconBuffer":Buffer|null
}

export type updateCollector = {
    batchId:number,
    batchData: {
        completedCount: number,
        newChapterCount: number, 
        newData: {
            mangaName:string, 
            urlBase:string, 
            slugList:string,
            chapterTextList:string, 
            currentIndex:number,
            iconBuffer:Buffer,
            mangaId:string
        }[]
    }
}

export type mangaUrlCheck = {
    success: true, 
    value:string
} | {
    success: false, 
    value:string, 
    statusCode: number
}
