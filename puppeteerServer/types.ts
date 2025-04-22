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

export const getOpts = {
    schema: {
        querystring: {
            urls: {type: 'array'},
            pass: {type: 'string'}
        }
    }
}

export const checkOpts = {
    schema: {
        querystring: {
            fetchIds: {type: 'array'},
            pass: {type: 'string'}
        }
    }
}