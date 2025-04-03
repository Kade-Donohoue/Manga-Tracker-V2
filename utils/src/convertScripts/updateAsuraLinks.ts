const config = require('../config.json')
const baseUrl = "https://asuracomic.net/series/"
const asura =  require("./puppeteerScripts/asuraV2")

interface pulledData {
    "mangaName":string, 
    "urlList":string, 
    "chapterTextList":string, 
    "currentIndex":number, 
    "iconBuffer":Buffer
}

async function fetchManga() {
    const resp = await fetch(`${config.serverUrl}/api/data/pull/getUpdateData`, {
        method: 'GET',
        headers: {
            "pass": config.serverPassWord
        }
    })
    if (config.verboselogging) console.log(resp)
    if (resp.status!=200) return console.log('issue fetching data' )

    const returnData = (await resp.json()).data
    if (config.verboselogging) console.log(returnData)

    let newData:{"mangaName":string, "urlList":string, "chapterTextList":string, "currentIndex":number, "iconBuffer":Buffer, mangaId:string}[] = []
    for (var i = 0; i < returnData.length; i++) {
        const firstChapUrl = returnData[i].urlList.substring(0, returnData[i].urlList.indexOf(','))
        if (config.verboselogging) console.log(firstChapUrl)
        if (!firstChapUrl.includes("asura")) continue

        const idTitleMatch = firstChapUrl.match(/https:\/\/asuracomic.net\/(\d+)-(.+)-chapter-\d+\//)
        if (!idTitleMatch) {
            console.log('unable to find manga id and title: ' + firstChapUrl)
            continue
        }
        const chapMatch = firstChapUrl.match(/chapter-(\d+)\//)
        if (!chapMatch) {
            console.log('unable to find chapter')
            continue
        }

        const convertedURL = `${baseUrl}${idTitleMatch[2/*title*/].replace(/-chapter-\d+/, '')}-${idTitleMatch[1]/*id*/}/chapter/${chapMatch[1]}`

        if (config.verboselogging) console.log(convertedURL)

        const tempNew:string|pulledData = await asura.getManga(convertedURL, false)

        if (typeof tempNew == "string") {
            console.log(`${tempNew}: ${returnData[i].mangaId}: ${convertedURL}`)
            continue
        } else {
            newData.push(({...(tempNew as pulledData), "mangaId": returnData[i].mangaId}))
        }
    }
    if (config.verboselogging) console.log(newData)
    console.log(newData)

    const updateResp = await fetch(`${config.serverUrl}/serverReq/data/updateManga`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "access_token": config.serverPassWord,
            "newData": newData
        }),
    })

    if (updateResp.ok) return console.log("Successfully Converted!")

    const error = await updateResp.json()
    console.warn('unable to save: ' + error.message)
}

fetchManga()