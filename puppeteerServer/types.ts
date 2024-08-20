export interface fetchData {
    "mangaName":string, 
    "chapterUrlList":string, 
    "chapterTextList":string, 
    "currentIndex":number, 
    "iconBuffer":Buffer|null
}

export interface updateCollector {
    batchId:number,
    batchData: {
        completedCount: number,
        newChapterCount: number, 
        newData: {
            mangaName:string,
            chapterUrlList:string,
            chapterTextList:string,
            currentIndex:number,
            iconBuffer:Buffer,
            mangaId:string
        }[]
    }
}