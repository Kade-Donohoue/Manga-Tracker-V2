# Manga Tracker V2
 Tracks manga using puppeteer. Uses discord activities and commands for user interface. 

# Parts
Each folder is a separate part of the bot and it has 3 main parts. 
1. the activity which handles interacting with databases as well as providing the activity. 
2. The puppeteer server. This handles fetching all manga data from websites and needs to be run locally 
3. The Text Command server. This is made to run locally and processes commands fetches required data from activity backend as well as create images for the user. 
4. the utils folder contains some tools primarily converting old manga bot db to new system

the first 2 are required while the text command is optional. Each folder has its own readme with setup instructions. 

# **Change Logs**

## Change Log v1.0.4
- Resolved issue where if you had ", " instead of "," in add manga it would be unable to get the url index. 
- restructured puppeteerServer scripts for pages
- added config option in puppeteer for redisIp
- config is now config.json.example instead of the json
- added error returned to user if job isn't recognized
- added support for asura scans
- updated puppeteerServer readme to match new config and support
- updated home page text
- fixed add bookmark dropdowns going off screen
- add bookmarks now shows folder paths instead of just the folder name

## Change Log v1.0.3
- Resolved pull script from reaper-scans returning base64 image rather than buffer
- Resolved reaper-scans returning double chapter text
- Changed statistics chapter count to use manga url chapter count(decimals are cut off) rather than number of urls
- reaper-scans now runs as headless

## Change Log v1.0.2
- fixed type error which prevented building
- added error reporting to end user for import bookmarks
- resolved issue where string was returned instead of json for puppeteer fetch error

## Change Log v1.0.1
- Changed timeout for grabbing dropdown in puppeteer down to 500 ms reducing how long it takes to tell you when you have a partial url
- fixed tunnel command to properly start tunnel
- Errors and confirmation messages now use toasts making it look nicer and visible from any page. 
-  switched to using react selects allowing for searching
- Added import bookmarks which allows you to import bookmarks from web browsers (opera gx, chrome, and firefox have been confirmed to work with instructions to get file)
- Feed next and previous buttons now grey out when they can't be clicked
- feed next and previous now highlight when hovered
- deploy and staging scripts now properly upload env vars to worker
- Error messages from puppeteer server now properly get passed to client
- removed getIcon file from Manganato as it was unused
- removed some commented out code from text command feed file