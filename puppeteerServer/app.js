const getManga = require('./mangaNato/getManga')
const {getQueue, updateQueue} = require('./jobQueue')
const express = require('express')
const app = express()
const getProc = require('./mangaGetProc')
const config = require('./config.json')

const port = 80
app.listen(port, function() {
    console.log(`Listening on port ${port}`)
})

app.get('/', function(req, res) {
    res.send("Hello!")
})

app.get('/updateManga', async function(req, res) {
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
    console.log(req.query)

    var webSite
    if (!req.query.url.includes('http')) return res.status(422).send({message: "Invalid URL!"})
    if (req.query.url.includes('manganato') && config.allowManganatoScans) webSite = "manganato"
    else if (req.query.url.includes('reaperscan') && config.allowReaperScans) webSite = "reaper"
    else if (req.query.url.includes('reaper-scan') && config.allowReaperScansFake) webSite = "reaper-scans-fake"
    else return res.status(422).send({message: "Unsupported WebPage"})
    if (!req.query.url.includes('chapter')) return res.status(422).send({message: "link provided is for an overview page. Please provide a link to a specific chapter page!"})

    const job = await getQueue.add({
        type: webSite,
        url: req.query.url, 
        getIcon: true,
        update: false
    }, {priority: 1})

    const response = await job.finished()
    if (response==null) return res.status(500).send({message: 'Unable to fetch Data! maybe invalid Url?'})
    // console.log(response)
    res.send(response)
})

setInterval(updateAllManger, config.updateDelay)

async function updateAllManger() {
    console.log(`Updating all manga at ${Date.now()}`)
    const resp = await fetch(`${config.serverUrl}/api/data/pull/getUpdateData`, {
        method: 'GET',
    })
    // console.log(resp)
    if (resp.status!=200) return console.log('issue fetching data to update all manga:' )

    const returnData = (await resp.json()).data
    console.log(returnData.length)
    for (var i = 0; i < returnData.length; i++) {
        const firstChapUrl = returnData[i].urlList.substring(0, returnData[i].urlList.indexOf(','))
        console.log(firstChapUrl)
        var webSite
        if (!firstChapUrl.includes('http')) return
        if (firstChapUrl.includes('manganato') && config.allowManganatoScans) webSite = "manganato"
        else if (firstChapUrl.includes('reaperscan') && config.allowReaperScans) webSite = "reaper"
        else if (firstChapUrl.includes('reaper-scan') && config.allowReaperScansFake) webSite = "reaper-scans-fake"
        else continue
        
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

updateAllManger()