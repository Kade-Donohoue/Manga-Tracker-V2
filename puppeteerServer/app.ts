import { Job, Queue, QueueEvents } from 'bullmq'
import {getQueue, comickQueue, getBrowser} from './jobQueue'
import {checkOpts, getOpts, updateCollector} from './types'
import {validMangaCheck} from './util'
import './mangaGetProc'
import fastify from 'fastify'
import config from './config.json'

const app = fastify()
const port = 80
const host = '0.0.0.0' //1.1.1.1 for local host only 0.0.0.0 for any interface
app.listen({port: port, host: host}, async function(err, address) {
    if (err) {
        console.error(err)
        process.exit(1)
    }

    if (config.queue.clearQueuesAtStart) {
        console.log('Clearing Queue! If this isn\'t the behavior you want change it in config.json')
        await getQueue.obliterate({force:true})
        await comickQueue.obliterate({force:true})
    }
    await getBrowser()//called to initiate browser otherwise if multiple jobs run at same time multiple browsers can be opened

    if (config.updateSettings.updateAtStart) updateAllManga()
    console.log(`Puppeteer server listening at: ${address}`)
})

app.get('/getManga', getOpts, async function(req, res) {
    let {pass, urls} = req.query as {pass: string, urls: string[]}

    console.log(urls)

    if (pass != config.serverCom.serverPassWord) return res.status(401).send({message: "Unauthorized"})

    let errors:{message:string, url:string}[] = []
    const universalJobs:{data:any,name:string,opts:any}[] = []
    const comickJobs:{data:any,name:string,opts:any}[] = []
    for (const url of urls) {
        const webSite = validMangaCheck(url)
        if (webSite.success === false) {
            errors.push({message: webSite.value, url:url})
            continue
        }

        const job = {
            name: webSite.value,
            data: {
                type: webSite.value,
                url: url.trim(), 
                getIcon: true,
                update: false
            },
            opts: {
                priority: 1,
                removeOnComplete: config.queue.removeCompleted,
                removeOnFail: config.queue.removeFailed,
                name: webSite.value
            }
        }

        if (webSite.value === 'comick') {
            comickJobs.push(job);
        } else {
            universalJobs.push(job);
        }
    }
    await getQueue.addBulk(universalJobs)
    await comickQueue.addBulk(comickJobs)

    const [universalAdded, comickAdded] = await Promise.all([
        getQueue.addBulk(universalJobs),
        comickQueue.addBulk(comickJobs)
    ])
    
    const jobs = [...universalAdded, ...comickAdded]
    
    const response = {addedManga: jobs.map(job => {return {fetchId: job.id, url:job.data.url}}), errors: errors}
    res.send(response)
})

app.get('/checkStatus/get', checkOpts, async function(req, res) {
    let {pass, fetchIds} = req.query as {pass: string, fetchIds: string[]}
    // console.log(fetchIds)

    if (pass != config.serverCom.serverPassWord) return res.status(401).send({message: "Unauthorized"})

    let data:{fetchId:string,status:string,statusCode:number,data:any}[] = []
    for (const fetchId of fetchIds) {
        let job = await getQueue.getJob(fetchId)

        if (!job) {
            job = await comickQueue.getJob(fetchId);
        }

        console.log('status check current job: ')
        console.log(job)
        if (!job) {
            console.log('Job Not Found!')
            data.push({fetchId:fetchId, status:"Not Found", statusCode:404,data:null}) 
            continue
        }
        
        if (await job.isCompleted()) data.push({fetchId:fetchId,status:"Completed",statusCode:200,data:job.returnvalue})
        else if (await job.isFailed()) data.push({fetchId:fetchId,status:"Failed",statusCode:500,data:job.failedReason})
        else {
            data.push({fetchId:fetchId,status:"Still Processing",statusCode:202,data:null})
            continue
        }

        //if job is completed or failed and client requests status check remove job from queue to clean it up
        if (config.queue.instantClearJob) await job.remove()
    }

    console.log(data)
    res.status(200).send({currentStatus: data})    
})

async function updateAllManga() {
    let date = new Date()
    if (config.updateSettings.autoUpdateInfo) console.log(`Updating all manga at ${date.toLocaleString()}`)
    try {
        const resp = await fetch(`${config.serverCom.serverUrl}/serverReq/data/getAllManga`, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "pass": config.serverCom.serverPassWord
            }
        })
        if (config.logging.verboseLogging) console.log(resp)
        if (resp.status!=200) return console.log('issue fetching data to update all manga:' )

        const returnData:{mangaId:string, urlBase:string, slugList:string, mangaName:string}[] = (await resp.json()).data
        if (config.logging.verboseLogging) console.log(returnData.length)
        // console.log(returnData)
        let batchId = Date.now()
        // let batchedJobs:{data:any,name:string,opts:any}[] = []
        const universalJobs:{data:any,name:string,opts:any}[] = []
        const comickJobs:{data:any,name:string,opts:any}[] = []
        let invalidCount = 0
        for (var i = 0; i < returnData.length; i++) {

            let firstChapUrl = ''
            if (returnData[i].slugList.indexOf(',') == -1) {
                if (returnData[i].slugList.length <= 0) {
                    console.log("Unable to find first chap skipping: " + returnData[i].mangaId)
                    if (config.logging.verboseLogging) console.log(returnData[i].slugList)
                    invalidCount++
                    continue
                } else {
                    firstChapUrl = returnData[i].urlBase+returnData[i].slugList.substring(0, returnData[i].slugList.length)
                }
            } else {
                firstChapUrl = returnData[i].urlBase+returnData[i].slugList.substring(0, returnData[i].slugList.indexOf(','))
            }
            if (config.logging.verboseLogging) console.log(firstChapUrl)

            const webSite = validMangaCheck(firstChapUrl)
            if (webSite.success === false) {
                console.log(`Disabled or Invalid URL in database, ${webSite.value}! Check your config and the database Skipping for now. mangaId:${returnData[i].mangaId}`)
                invalidCount++
                continue
            }
            if (config.logging.verboseLogging) console.log(returnData[i])

            const job = {
                name: webSite.value,
                data: {
                    type: webSite.value,
                    url: firstChapUrl,
                    mangaId: returnData[i].mangaId,
                    getIcon: config.updateSettings.refetchImgs,
                    update: true,
                    length: returnData.length - invalidCount,
                    oldSlugList: returnData[i].slugList,
                    batchId: batchId
                },
                opts: {
                    priority: 2,
                    removeOnComplete: config.queue.removeCompleted,
                    removeOnFail: config.queue.removeFailed,
                    attempts: 2,
                    name: webSite.value
                }
            }

            if (webSite.value === 'comick') {
                comickJobs.push(job);
            } else {
                universalJobs.push(job);
            }
        }
        await getQueue.addBulk(universalJobs)
        await comickQueue.addBulk(comickJobs)

        if (config.logging.verboseLogging) console.log('Jobs Added to Queue')
    } catch (err) {
        console.error(err)
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
        if ((job.returnvalue.iconBuffer) || (job.returnvalue.urlList && job.returnvalue.urlList != job.data.oldSlugList)) {
            dataCollector[dataIndex].batchData.newChapterCount+=((job.returnvalue.slugList.match(/,/g) || []).length - (job.data.oldSlugList.match(/,/g) || []).length)
            dataCollector[dataIndex].batchData.newData.push({...job.returnvalue, mangaId: job.data.mangaId})
        }

        if (config.queue.instantClearJob) await job.remove()

        if (job.data.length <= dataCollector[dataIndex].batchData.completedCount) sendUpdate(dataIndex)
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

        if (job.data.length <= dataCollector[dataIndex].batchData.completedCount) sendUpdate(dataIndex)

        if (config.queue.instantClearJob) await job.remove()
    }
})

async function sendUpdate(dataIndex:number) {
    if (dataCollector[dataIndex].batchData.newData.length > 0) {
        if (!config.updateSettings.refetchImgs) {
            const resp = await fetch(`${config.serverCom.serverUrl}/serverReq/data/updateManga`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "pass": config.serverCom.serverPassWord,
                },
                body: JSON.stringify({
                    "newData": dataCollector[dataIndex].batchData.newData,
                    "amountNewChapters": dataCollector[dataIndex].batchData.newChapterCount
                }),
            })

            if (!resp.ok) console.warn(resp)
                else if (config.updateSettings.autoUpdateInfo) console.log(`${dataCollector[dataIndex].batchData.newData.length} / ${dataCollector[dataIndex].batchData.completedCount} Manga Update Saved With ${dataCollector[dataIndex].batchData.newChapterCount} New Chapters!`)
        
        } else {
            for (let i = 0; i < dataCollector[dataIndex].batchData.newData.length; i++) {
                const resp = await fetch(`${config.serverCom.serverUrl}/serverReq/data/updateManga`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        "pass": config.serverCom.serverPassWord,
                    },
                    body: JSON.stringify({
                        "newData": [dataCollector[dataIndex].batchData.newData[i]],
                        "amountNewChapters": dataCollector[dataIndex].batchData.newChapterCount
                    }),
                })

                if (!resp.ok) console.warn(`Failed to save!; ${dataCollector[dataIndex].batchData.newData[i].mangaId}`)
            }
            console.log('done, Its recomended to turn of auto update images now!')
        }
        

        
    } else if (config.updateSettings.autoUpdateInfo) console.log('Update Complete! No New Chapters Found!')
    dataCollector.splice(dataIndex, 1)
}

setInterval(updateAllManga, config.updateSettings.updateDelay)