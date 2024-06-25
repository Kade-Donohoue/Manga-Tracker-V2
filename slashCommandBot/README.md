# Slash Command Bot
## Description
Discord bot that interacts with backend of activity to provide tracked manga info

## Requirements
- node JS 20.11.0
- npm 10.2.4
- an application created in the Discord developer portal


## How to Use
1. Download repo
2. Install all required modules using `npm install`
3. Fill out `tokenSample.json` with the required info and rename it to `token.json`
4. Check out `config.json` and provide urls for worker and image bucket
5. start activity server
6. Use `node .` in the repo folder to start the bot

# Config

## token.json
- code: Token of bot. Found under the bot section of the discord developer portal. You may have to reset the token to get it
- public: Public Key of the discord bot. This can be found under general information of Discord developer portal
- appID: Application ID of the discord bot. This can be found under general information of Discord developer portal
- guildID: ID of your test discord server

## config.json
- globalCommands: (default: false) Have commands as global (anywhere the bot is including DMs) or just the provided guildID
- updateDelay: (default: 7200000) Delay in milliseconds between updating all manga stored in DB
- updateAtStart: (default: true) whether or not all manga should be updated when started
- allowManganatoScans: (default: true) Enable or disable the ability to add or update Manganato
- allowReaperScans: (default: false) Enable or disable the ability to add or update Reaper Scans(protected by cloudflare)
- allowReaperScansFake: (default: true) Enable or disable the ability to add or update Reaper-Scans(May work better for scraping and contains same content)
- serverUrl: (default: blank) URL for server worker 
- imageUrlBase: (default: blank) url base for image bucket