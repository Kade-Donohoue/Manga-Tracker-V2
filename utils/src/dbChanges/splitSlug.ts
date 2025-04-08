import config from '../../config.json'

const serverUrl = config.serverUrl
const puppeteerUrl = config.puppeteerUrl
const serverPass = config.serverPassWord

async function main() {
    const mangaRequest = await fetch(`${serverUrl}/serverReq/data/getAllManga`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "pass": serverPass
        }
    })

    if (!mangaRequest.ok) throw new Error('Unable to fetch Manga Data!')

    const mangaData:updateData = (await mangaRequest.json()).data

    let puppeteerData:{firstUrl:string,mangaId:string}[] = await Promise.all(mangaData.map(async manga => {
        let firstUrl = (manga.urlBase+manga.slugList.substring(0, manga.slugList.indexOf(',')))||manga.slugList

        return {firstUrl:firstUrl, mangaId:manga.mangaId}
    }))

    const chunkSize = 20; // Adjust based on URL length or server limits
    const urls = puppeteerData.map(item => item.firstUrl);

    // Helper to chunk the array
    function chunkArray<T>(arr: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    const urlChunks = chunkArray(urls, chunkSize);

    const addedManga: { fetchId: string; url: string }[] = [];
    const errors: { message: string; url: string; success: false }[] = [];

    for (const chunk of urlChunks) {
        const query = chunk.join('&urls=');
        const fullUrl = `${puppeteerUrl}/getManga?${query}&pass=${serverPass}`;

        const mangaReq = await fetch(fullUrl, { method: 'GET' });
        console.log(`Request to: ${fullUrl}`);

        if (!mangaReq.ok) {
            try {
                const errorResp = await mangaReq.json();
                errors.push(...(errorResp.errors || [{
                    message: errorResp.message || 'Unknown error',
                    url: 'unknown',
                    success: false
                }]));
            } catch {
                errors.push({ message: 'Failed to parse error response', url: 'unknown', success: false });
            }
            continue;
        }

        try {
            const result = await mangaReq.json();
            addedManga.push(...(result.addedManga || []));
            errors.push(...(result.errors || []));
        } catch {
            errors.push({ message: 'Failed to parse response JSON', url: 'unknown', success: false });
        }
    }

    const waitingManga = new Map<string, string>( addedManga.map(item => [item.fetchId, item.url]))

    let newMangaInfo:mangaReturn[] = [] 
    let userReturn:{url:string, message:string, success:boolean}[] = [...errors]
    while (waitingManga.size >= 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000))

        let currentStatusRes = await fetch(`${puppeteerUrl}/checkStatus/get?fetchIds=${Array.from(waitingManga.keys()).join('&fetchIds=')}&pass=${serverPass}`)

        if (!currentStatusRes.ok) continue

        let { currentStatus }:{currentStatus:{fetchId:string,status:string,statusCode:number,data:any}[]}= await currentStatusRes.json() 

        for (let currentJobStatus of currentStatus) {
            if (currentJobStatus.statusCode === 202) { //still processing
                continue
            } else if (currentJobStatus.statusCode === 200) { //Finished
                let currFetchUrl = puppeteerData.find(item => item.firstUrl === waitingManga.get(currentJobStatus.fetchId)).mangaId
                newMangaInfo.push({...currentJobStatus.data, mangaId:currFetchUrl, iconBuffer:null})
                userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: 'Successfully added', success: true})
                waitingManga.delete(currentJobStatus.fetchId)
            } else if (currentJobStatus.statusCode === 500) {//failed
                userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: currentJobStatus.data, success: false})
                waitingManga.delete(currentJobStatus.fetchId)
            } else if (currentJobStatus.statusCode === 404) {//Job Lost?
                userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: "Internal Server Error!", success: false})
                waitingManga.delete(currentJobStatus.fetchId)
            } else { //unknown
                userReturn.push({url: waitingManga.get(currentJobStatus.fetchId) as string, message: "An unknown Error occurred please contact an admin!", success: false})
                waitingManga.delete(currentJobStatus.fetchId)
            }
        }
    }


    console.log(newMangaInfo)


    // console.log(puppeteerData)
    // throw new Error('Pause for testing check output')
    const saveResp = await fetch(`${serverUrl}/serverReq/data/updateManga`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "pass": serverPass,
        },
        body: JSON.stringify({
            "newData": newMangaInfo,
            "amountNewChapters": 0
        }),
    })

    console.log(saveResp)
}

type updateData = {
    mangaId:string, 
    urlBase:string, 
    slugList:string, 
    mangaName:string
}[]

type mangaData = {
    mangaName:string, 
    urlBase:string, 
    slugList:string,
    chapterTextList:string, 
    currentIndex:number,
    iconBuffer:Buffer,
    mangaId:string
}[]

type mangaReturn = { 
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

  type mangaReturnWithId = { 
    "mangaId": string,
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

main()