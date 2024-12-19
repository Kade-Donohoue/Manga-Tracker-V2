import config from '../../config.json'
import * as readline from "readline";
import { getManga } from '../puppeteerScripts/reaper-scans'

const askQuestion = (query: string): Promise<string> => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    return new Promise((resolve) => {
      rl.question(query, (answer) => {
        resolve(answer);
        rl.close();
      });
    });
  };
  
  

interface mangaMinData {urlList: string, mangaId: string}
interface mangaData {"mangaName":string, "chapterUrlList":string, "chapterTextList":string, "currentIndex":number, "iconBuffer":Buffer, mangaId:string}

async function fixManga() {

    console.log(config.serverUrl, config.serverPassWord)

    const mangaResp = await fetch(`${config.serverUrl}/api/data/pull/getUpdateData`, {
        method: 'GET',
        headers: {
            "pass": config.serverPassWord
        }
    })

    if (!mangaResp.ok) throw Error('Unable to fetch Manga Data! confirm url and server password')

    let mangaData:mangaMinData[] = (await mangaResp.json()).data

    // console.log(Object.keys((await mangaResp.json()).data[0]))
    // return
    // let mangaData
    let newData:mangaData[] = []
    const idRegex = /\/[a-fA-F0-9]{8}-/
    for (let i = 0; i < mangaData.length; i++) {
        console.clear()
        try {
            let firstUrl = mangaData[i].urlList.split(',')[0]
            if (firstUrl.includes('reaper-scans')) {
                firstUrl = firstUrl.replace(idRegex, '/').replace(/reaper-scans\.com\//g, 'reaper-scans.com/manga/').replace(/-chapter/g, '/chapter')
                // firstUrl = firstUrl
                
                // console.log(mangaData[i].urlList)
                let resp = await askQuestion(`${firstUrl}\nIs this url correct? Y/n\n`)
                if (resp.toLowerCase() === "y") {
                    newData.push({...await getManga(firstUrl), mangaId: mangaData[i].mangaId})
                } else {
                    let newURL = await askQuestion('Whats the correct URL?\n')
                    newData.push({...await getManga(newURL.toLowerCase()), mangaId: mangaData[i].mangaId})
                    // newData.push({mangaId: mangaData[i].mangaId, chapterUrlList:newURL.toLowerCase(), mangaName: '', chapterTextList: '', currentIndex: 1, iconBuffer: null})
                }
                // console.log()
            }
        } catch (e) {
            console.warn(e)
        }
    }

    console.log(newData)
    return
    const updateResp = await fetch(`${config.serverUrl}/api/data/update/bulkUpdateMangaInfo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "access_token": config.serverPassWord,
            "newData": mangaData
        }),
    })

    if (!updateResp.ok) throw Error('Unable to save updated manga!')

    console.log('Saved all new manga!')
}

fixManga()