# Puppeteer Server
This is in charge of fetching all manga data from various sources

# Supported Websites
- MangaNato
- Reaper-Scans
- AsuraScans

# Setup
1. Install Redis or alternates like Valkey on system (https://github.com/valkey-io/valkey)
2. copy `config.json.example` to `config.json` and configure as needed
3. run `npm install`
4. If you want to use a service like cloudflare tunnel open app.ts and change host to 1.1.1.1
5. run `npm run start`

# config
 - allowManganatoScans: whether or not manganato is allowed (default: true)
 - allowMangaDex: whether or not mangaDex is allowed (default: true)
 - allowReaperScans: whether or not to allow fake reaper scans (default: true)
 - allowReaperScansFake: whether or not to allow fake reaper scans (default: true)
 - allowAsura: whether or not to allow Asura Scans (default: true)
<br/><br/>
 - redisIp: Ip address to redis server (default: "127.0.0.1")
 - instances: number of Scrappers to run at once (default: 3)
 - clearQueueAtStart: Enable or Disables queue being completely wiped at start (default: false)
 - instantClearJobs: When enabled jobs will be removed as soon as data is pulled from them (default: true)
 - removeCompleted: max number of completed jobs to store in queue (default: 1000)
 - removeFailed: max number of failed jobs to store in queue (default: 5000)
<br/><br/>
 - serverUrl: url to activities workers (default: "enter_url_here")
 - serverPassword: Password to secure server-server communication (default: "secret_Password_Change_Me")
<br/><br/>
 - updateDelay: milliseconds between updates (default: 2Hr)
 - updateAtStart: whether or not to update all manga on server start (default: true)
<br/><br/>
 - autoUpdateInfo: When enabled basic auto update information is provided when it finishes/start (default: true)
 - verboseLogging: When enabled detailed logging for jobs are provided (default: false)