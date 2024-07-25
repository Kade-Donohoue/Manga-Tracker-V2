# Puppeteer Server
This is in charge of fetching all manga data from various sources

# Supported Websites
- MangaNato
- Reaper-Scans
- AsuraScans

# Setup
1. Install Redis on system (https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/)
2. copy `config.json.example` to `config.json` and configure as needed
3. run `npm install`
4. run `npm run start`

# config
 - updateDelay: milliseconds between updates (default: 2Hr)
 - updateAtStart: weather or not to update all manga on server start (default: true)
 - allowManganatoScans: wether or not manganato is allowed (default: true)
 - allowReaperScansFake: wether or not to allow fake reaper scans (default: true)
 - allowAsura: Wether or not to allow Asura Scans (default: true)
 - serverURL: url to activities workers (default: "enter_url_here")
 - redisIp: Ip address to redis server (default: "127.0.0.1")