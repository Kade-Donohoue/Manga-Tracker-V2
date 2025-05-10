# Puppeteer Server
This is in charge of fetching all manga data from various sources

# Supported Websites
- MangaNato
<!-- - Reaper Scans -->
- AsuraScans
- Comick
- MangaDex

# Setup
1. Install Redis or alternates like [Valkey](https://github.com/valkey-io/valkey) 
2. copy `config.json.example` to `config.json` and configure as needed
3. run `npm install`
4. If you want to use a service like cloudflare tunnel open app.ts and change host to 1.1.1.1
5. run `npm run start`

## Configuration

### Site Permissions
- **allowManganatoScans**: Whether or not Manganato is allowed (default: `true`).
- **allowMangaDex**: Whether or not MangaDex is allowed (default: `true`).
- **allowReaperScans**: Whether or not to allow Reaper Scans - Deprecated (default: `false`).
- **allowAsura**: Whether or not to allow Asura Scans (default: `true`).
- **allowComick**: Whether or not to allow Comick (default: `true`).

### Queue Settings
- **redisIp**: IP address to the Redis server (default: `127.0.0.1`).
- **instances**: Number of scrapers to run at once (default: `3`).
- **clearQueueAtStart**: Enables or disables the queue being completely wiped at the start (default: `true`).
- **instantClearJobs**: When enabled, jobs will be removed as soon as data is pulled from them (default: `false`).
- **removeCompleted**: Maximum number of completed jobs to store in the queue (default: `1000`).
- **removeFailed**: Maximum number of failed jobs to store in the queue (default: `5000`).

### Logging Settings
- **verboseLogging**: When enabled, detailed logging for jobs is provided (default: `false`).

### Server Communication
- **serverUrl**: URL to the activities workers (default: `"enter_url_here"`).
- **serverPassword**: Password to secure server-server communication (default: `"secret_Password_Change_Me"`).

### Update Settings
- **autoUpdateInfo**: When enabled, basic auto-update information is provided when it finishes/starts (default: `true`).
- **updateDelay**: Milliseconds between updates (default: `7200000` or 2 hours).
- **updateAtStart**: Whether or not to update all manga on server start (default: `true`).
- **refetchImgs**: If all images should be refetched when updating manga. Leave as `false` unless you need images updated (default: `false`).
