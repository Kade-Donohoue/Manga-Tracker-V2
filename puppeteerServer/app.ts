import { Job, Queue, QueueEvents } from 'bullmq'
import {getQueue, updateQueue} from './jobQueue'
import {updateCollector} from './types'
import './mangaGetProc'
import fastify from 'fastify'
import config from './config.json'

const app = fastify()
const port = 80
const host = '0.0.0.0' //1.1.1.1 for local host only 0.0.0.0 for any interface
app.listen({port: port, host: host}, function(err, address) {
    if (err) {
        console.error(err)
        process.exit(1)
    }

    if (config.queue.clearQueuesAtStart) {
        console.log('Clearing Queue! If this isn\'t the behavior you want change it in config.json')
        getQueue.obliterate({force:true})
        updateQueue.obliterate({force:true})
    }

    if (config.updateSettings.updateAtStart) updateAllManga()
    console.log(`Puppeteer server listening at: ${address}`)
})

//currently not used may be deprecated
app.get('/updateManga', async function(req, res) {
    let {pass, url} = req.query as {pass: string, url: string}

    console.log(pass)
    if (pass != config.serverCom.serverPassWord) return res.status(401).send({message: "Unauthorized"})

    var webSite
    if (!url.includes('http')) return res.status(422).send({message: "Invalid URL!"})
    if (url.includes('manganato')) webSite = "manganato"
    else if (url.includes('reaperscan')) webSite = "reaper"
    else if (url.includes('reaper-scan')) webSite = "reaper-scans-fake"
    else return res.status(422).send({message: "Unsupported WebPage"})

    const job = await getQueue.add('User Update Manga', {
        type: webSite,
        url: url, 
        getIcon: false,
        update: false
    }, {priority: 2, removeOnComplete: config.queue.removeCompleted, removeOnFail: config.queue.removeFailed})

    const response = {fetchId: job.id}
    if (config.logging.verboseLogging) console.log(response)
    res.send(response)
})

app.get('/getManga', async function(req, res) {
    let {pass, url} = req.query as {pass: string, url: string}

    if (pass != config.serverCom.serverPassWord) return res.status(401).send({message: "Unauthorized"})

    var webSite:string
    if (!url.includes('http')) return res.status(422).send({message: "Invalid URL!"})
    if (url.includes('manganato') && config.sites.allowManganatoScans) webSite = "manganato"
    else if (url.includes('mangadex') && config.sites.allowMangaDex) webSite = "mangadex"
    else if (url.includes('reaperscans') && config.sites.allowReaperScans) webSite = "reaperScans"
    else if (url.includes('reaper-scan') && config.sites.allowReaperScansFake) webSite = "reaper-scans-fake"
    else if (url.includes('asura') && config.sites.allowAsura) webSite = "asura"
    else return res.status(422).send({message: "Unsupported WebPage"})
    if (!url.includes('chapter') && !url.includes('ch-')) return res.status(422).send({message: "link provided is for an overview page. Please provide a link to a specific chapter page!"})

    const job = await getQueue.add('User Full Fetch', {
        type: webSite,
        url: url.trim(), 
        getIcon: true,
        update: false
    }, {priority: 1, removeOnComplete: config.queue.removeCompleted, removeOnFail: config.queue.removeFailed})

    const response = {fetchId: job.id}
    // console.log(typeof response)
    // if (typeof response === "string") return res.status(500).send({message: response})
    res.send(response)
})

app.get('/checkStatus/get', async function(req, res) {
    let {pass, fetchId} = req.query as {pass: string, fetchId: string}

    if (pass != config.serverCom.serverPassWord) return res.status(401).send({message: "Unauthorized"})

    const job = await getQueue.getJob(fetchId)

    if (!job) return res.status(404).send({message:'Not Found'})

    if (config.logging.verboseLogging) console.log(job, await job.isFailed())

    if (await job.isCompleted()) res.send(await job.returnvalue)
    else if (await job.isFailed()) res.status(500).send({message: job.failedReason})
    else return res.status(202).send({message: 'Still Processing'})

    //if job is completed or failed and client requests status check remove job from queue to clean it up
    if (config.queue.instantClearJob) await job.remove()
})


async function updateAllManga() {
    if (config.logging.autoUpdateInfo) console.log(`Updating all manga at ${Date.now()}`)
    const resp = await fetch(`${config.serverCom.serverUrl}/api/data/pull/getUpdateData`, {
        method: 'GET',
        headers: {
            "pass": config.serverCom.serverPassWord
        }
    })
    if (config.logging.verboseLogging) console.log(resp)
    if (resp.status!=200) return console.log('issue fetching data to update all manga:' )

    const returnData = (await resp.json()).data
    if (config.logging.verboseLogging) console.log(returnData.length)
    // console.log(returnData)
    let batchId = Date.now()
    for (var i = 0; i < returnData.length; i++) {

        let firstChapUrl = ''
        if (returnData[i].urlList.indexOf(',') == -1) {
            if (returnData[i].urlList.length <= 0) {
                console.log("Unable to find first chap skipping: " + returnData[i].mangaId)
                if (config.logging.verboseLogging) console.log(returnData[i].urlList)
                continue
            } else {
                firstChapUrl = returnData[i].urlList.substring(0, returnData[i].urlList.length)
            }
        } else {
            firstChapUrl = returnData[i].urlList.substring(0, returnData[i].urlList.indexOf(','))
        }
        if (config.logging.verboseLogging) console.log(firstChapUrl)
        var webSite:string
        if (!firstChapUrl.includes('http')) return
        if (firstChapUrl.includes('manganato') && config.sites.allowManganatoScans) webSite = "manganato"
        else if (firstChapUrl.includes('mangadex') && config.sites.allowMangaDex) webSite = "mangadex"
        else if (firstChapUrl.includes('reaperscans') && config.sites.allowReaperScans) webSite = "reaperScans"
        else if (firstChapUrl.includes('reaper-scan') && config.sites.allowReaperScansFake) webSite = "reaper-scans-fake"
        else if (firstChapUrl.includes('asura') && config.sites.allowAsura) webSite = "asura"
        else {
            console.log(`unknown id db skipping: id: ${returnData[i].mangaId}, url: ${firstChapUrl}`)
            continue
        }
        if (config.logging.verboseLogging) console.log(returnData[i])
        getQueue.add('Auto Update Manga', {
            type: webSite,
            url: firstChapUrl,
            mangaId: returnData[i].mangaId, 
            getIcon: false,
            update: true,    
            length: returnData.length,
            oldUrlList: returnData[i].urlList,
            batchId: batchId
        }, {priority: 2, removeOnComplete: config.queue.removeCompleted, removeOnFail: config.queue.removeFailed, attempts: 2})
    }
}

let dataCollector:updateCollector[] = []
const getEvents = new QueueEvents('Get Manga Queue')
getEvents.on('completed', async ({ jobId }:{jobId:string}) => {
    const job = await Job.fromId(getQueue, jobId)

    if (job.data.update) {
        let dataIndex = dataCollector.map(a=>a.batchId).indexOf(job.data.batchId)
        if (dataIndex==-1) {
            dataCollector.push({batchId: job.data.batchId, batchData:{completedCount:0,newChapterCount:0,newData:[]}} as updateCollector)
            dataIndex = dataCollector.length-1
        }

        dataCollector[dataIndex].batchData.completedCount++
        if (job.returnvalue.chapterUrlList && job.returnvalue.chapterUrlList != job.data.oldUrlList) {
            dataCollector[dataIndex].batchData.newChapterCount+=((job.returnvalue.chapterUrlList.match(/,/g) || []).length - (job.data.oldUrlList.match(/,/g) || []).length)
            dataCollector[dataIndex].batchData.newData.push({...job.returnvalue, mangaId: job.data.mangaId})
        }

        if (config.queue.instantClearJob) await job.remove()

        if (job.data.length <= dataCollector[dataIndex].batchData.completedCount) {
            if (dataCollector[dataIndex].batchData.newData.length > 0) {
                const resp = await fetch(`${config.serverCom.serverUrl}/api/data/update/bulkUpdateMangaInfo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        "access_token": config.serverCom.serverPassWord,
                        "newData": dataCollector[dataIndex].batchData.newData,
                        "amountNewChapters": dataCollector[dataIndex].batchData.newChapterCount
                    }),
                })

                if (!resp.ok) console.warn(await resp.json())
                else if (config.logging.autoUpdateInfo) console.log(`${dataCollector[dataIndex].batchData.newData.length} / ${dataCollector[dataIndex].batchData.completedCount} Manga Update Saved With ${dataCollector[dataIndex].batchData.newChapterCount} New Chapters!`)

            } else if (config.logging.autoUpdateInfo) console.log('Update Complete! No New Chapters Found!')
            dataCollector.splice(dataIndex, 1)
        }
    }
})

getEvents.on('failed', async ({ jobId }:{jobId:string}) => {
    const job = await Job.fromId(getQueue, jobId)

    if (job.data.update) {
        let dataIndex = dataCollector.map(a=>a.batchId).indexOf(job.data.batchId)

        if (dataIndex==-1) {
            dataCollector.push({batchId: job.data.batchId, batchData:{completedCount:0,newChapterCount:0,newData:[]}} as updateCollector)
            dataIndex = dataCollector.length-1
        }
        dataCollector[dataIndex].batchData.completedCount++

        if (config.queue.instantClearJob) await job.remove()
    }
})

setInterval(updateAllManga, config.updateSettings.updateDelay)