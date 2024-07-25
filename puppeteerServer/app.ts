const {getQueue, updateQueue} = require('./jobQueue')
const processor = require('./mangaGetProc')
const express = require('express')
import config from './config.json'

const app = express()
const port = 80
app.listen(port, function() {
    console.log(`Listening on port ${port}`)
})

app.get('/updateManga', async function(req, res) {

    if (req.query.pass == config.serverPassWord) return res.status(401).send({message: "Unauthorized"})

    var webSite
    if (!req.query.url.includes('http')) return res.status(422).send({message: "Invalid URL!"})
    if (req.query.url.includes('manganato')) webSite = "manganato"
    else if (req.query.url.includes('reaperscan')) webSite = "reaper"
    else if (req.query.url.includes('reaper-scan')) webSite = "reaper-scans-fake"
    else return res.status(422).send({message: "Unsupported WebPage"})

    const job = await getQueue.add({
        type: webSite,
        url: req.query.url, 
        getIcon: false,
        update: false
    }, {priority: 2})

    const response = await job.finished()
    // console.log(response)
    res.send(response)
})

app.get('/getManga/', async function(req, res) {
    // console.log(req.query)
    if (req.query.pass == config.serverPassWord) return res.status(401).send({message: "Unauthorized"})

    var webSite
    if (!req.query.url.includes('http')) return res.status(422).send({message: "Invalid URL!"})
    if (req.query.url.includes('manganato') && config.allowManganatoScans) webSite = "manganato"
    else if (req.query.url.includes('reaperscan') && config.allowReaperScans) webSite = "reaper"
    else if (req.query.url.includes('reaper-scan') && config.allowReaperScansFake) webSite = "reaper-scans-fake"
    else if (req.query.url.includes('asura') && config.allowAsura) webSite = "asura"
    else return res.status(422).send({message: "Unsupported WebPage"})
    if (!req.query.url.includes('chapter') && !req.query.url.includes('ch-')) return res.status(422).send({message: "link provided is for an overview page. Please provide a link to a specific chapter page!"})

    const job = await getQueue.add({
        type: webSite,
        url: req.query.url.trim(), 
        getIcon: true,
        update: false
    }, {priority: 1})

    const response = await job.finished()
    // console.log(typeof response)
    if (typeof response === "string") return res.status(500).send({message: response})
    res.send(response)
})

setInterval(updateAllManger, config.updateDelay)

async function updateAllManger() {
    await getQueue.obliterate({ force: true });
    if (config.verboseLogging) console.log(`Updating all manga at ${Date.now()}`)
    const resp = await fetch(`${config.serverUrl}/api/data/pull/getUpdateData`, {
        method: 'GET',
        headers: {
            "pass": config.serverPassWord
        }
    })
    if (config.verboseLogging) console.log(resp)
    if (resp.status!=200) return console.log('issue fetching data to update all manga:' )

    const returnData = (await resp.json()).data
    if (config.verboseLogging) console.log(returnData.length)
    // console.log(returnData)
    for (var i = 0; i < returnData.length; i++) {
        if (returnData[i].urlList.indexOf(',') == -1) {
            console.log(returnData[i].urlList)
            console.log("Unable to find first chap skipping")
            continue
        }
        // const chapList = returnData[i].urlList.split('^[,]+$')
        const firstChapUrl = returnData[i].urlList.substring(0, returnData[i].urlList.indexOf(','))
        if (config.verboseLogging) console.log(firstChapUrl)
        var webSite:string
        if (!firstChapUrl.includes('http')) return
        if (firstChapUrl.includes('manganato') && config.allowManganatoScans) webSite = "manganato"
        else if (firstChapUrl.includes('reaperscan') && config.allowReaperScans) webSite = "reaper"
        else if (firstChapUrl.includes('reaper-scan') && config.allowReaperScansFake) webSite = "reaper-scans-fake"
        else if (firstChapUrl.includes('asura') && config.allowAsura) webSite = "asura"
        else {
            console.log('unknown id db skipping: ' + firstChapUrl)
            continue
        }
        
        getQueue.add({
            type: webSite,
            url: firstChapUrl,
            mangaId: returnData[i].mangaId, 
            getIcon: false,
            update: true,    
            length: returnData.length
        }, {priority: 2})
    }
    
}
if (config.updateAtStart) updateAllManger()