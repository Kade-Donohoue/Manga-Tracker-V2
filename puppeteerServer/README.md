# Puppeteer Server
This is in charge of fetching all manga data from various sources

# Supported Websites
- MangaNato
- Reaper-Scans

# Setup
1. Install Redis on system (https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/)
2. run `node .`

# config
 - updateDelay: miliseconds between updates (default: 2Hr)
 - updateAtStart: weather or not to update all manga on server start (default: true)
 - allowManganatoScans: wether or not manganato is allowed (default: true)
 - allowReaperScansFake: wether or not to allow fake reaper scans (default: true)
 - serverURL: url to activities workers (default: blank)