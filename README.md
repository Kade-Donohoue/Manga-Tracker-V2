# Manga Tracker V2
 Tracks manga using puppeteer. Uses discord activities and commands for user interface. 

# Parts
Each folder is a separate part of the bot and it has 3 main parts. 
1. the activity which handles interacting with databases as well as providing the activity. 
2. The puppeteer server. This handles fetching all manga data from websites and needs to be run locally 
3. The Text Command server. This is made to run locally and processes commands fetches required data from activity backend as well as create images for the user. 
4. the utils folder contains some tools primarily converting old manga bot db to new system

the first 2 are required while the text command and utils are optional. Each folder has its own readme with setup instructions. 

# **Change Logs**

## Change Log 1.3.0
 - Destop app now created using electron
 - tokens are now stored in local Storage
 - favicon is now Manga Trackers Icon instead of the default

## Change Log 1.2.4
 - fixed refresh token being lost whenever browser was closed resulting in random logouts

## Change Log 1.2.3
 - fixed edge case that would prevent asura from getting data
 - added observability for new cloudflare logs into example

## Change Log 1.2.2
 - If adding fails the button is usable after fail
 - fixed images not loading for feed
 - removed categories V1 in favor of the new version
 - updated wrangler to support new logging
 - new manga is now correctly counted and manga already tracked being added again no longer counts towards the statistics
 - bulk Update can now support saving images
 - fixed CORS response
 - Icon buffer now is correct data type
 - reimplemented bulk update to fix some issues and add support for bulk updating all images
 - fixed asura scans to support latest update
 - improved asura scans logging
 - fixed name of launch button

## Change Log 1.2.1
 - default auth link now uses environmental vars to create link
 - when authorizing with code or refresh token it now gets saved propperly
 - feed now saves interact time again
 - removed vite.config.ts.example as you no longer need to config anything
 - icons are now being saved again
 - added option to enable / disable saving icons on update
 - OPTIONS requests to servers now get a response
 - CORS headers are added to responses now
 - Update terminal message time updates to human readable format
 - resolved update manga not saving if last manga in batch failed
 - updated README.md for magnaActivity to match new requirements 
 - image URL is now env var instead of hard coded value

## Change Log 1.2.0
- Added support for logging in on webbrowser with login with discord button
- logout button added
- added env vars for server and client URL
- removed mangaName from user Table
- added more catches resolving edge cases that would prevent stats from being generated
- manga no user is reading is now removed whenever puppeteer server fetches all manga
- updated asura script to work with new update

## Change Log 1.1.8
- resolved typeError in viewTracker

## Change Log 1.1.7
 - Updates Discord SDK
 - changed all fetch for activity to comply with discord content security policy
 - changed oauth2 to include application commands
 - added support to launch activity in text channel
 - Changed server response format for all pull requests
 - added ability to add multiple manga in a single request
 - Filters are now available for view tracked
 - added setting for user options that allows for deleting all user data
 - forgot user endpoint now also removes user categories
 - fixed blank schema to create tables with correct name instead of _Copy
 - added validation to getUserManga to prevent potential SQL injection
 - updated asura script to work when chapterData was spread across arrays at end markers
 - added check to puppeteer scripts to prevent trying to close page when its already closed

## Change Log 1.1.6
 - Moved initial getManga into fastify start function with await to ensure it starts before auto update
 - manga Url checks for puppeteer server have been moved to dedicated function
 - Auto Update jobs are now added in bulk rather than one at a time

## Change Log 1.1.5
- Asura Scans script has been upgraded to improve performance
- all scraping default load time is limited to 1 sec and page loading time is 10 sec
- job.log no is used to have logs showing where a job is at with timestamps
- added a util called queue viewer that gives insight into the job queue
- mangaNato now pulls manga url from website instead of splicing provided url
- site loading timeout is now 10 seconds while selection timeouts is now 1 second

## Change Log 1.1.4
- addUtils getManga no longer sends param for fetching icon
- puppeteer server now uses bullMQ
- puppeteer server can now run multiple instances
- puppeteer server no longer opens and closes browser for each page increasing performance
- default host for puppeteer server is now 0.0.0.0 
- new config options including clearing queue at start, 
- puppeteer config has been restructured
- cleaned puppeteer server imports
- added job progress reporting
- new tab is no longer opened for fetching cover images
- better error reporting for puppeteer server
- database metrics are now only sent to clients in development or staging builds
- resolved manganato getting to an endless loading state when cover image wasn't loadable
- updated puppeteer server readme to match new config
- puppeteer server update collector has been rebuilt resolving potential issues(not saving updates, getting data from multiple updates combined if it took longer than updateInterval)
- puppeteer now returns a fetchId that is used to poll fetch status of manga info
- slash Command bot has been fixed and now uses userInfo rather than userData

## Change Log 1.1.3
- fixed type errors in settings

## Change Log 1.1.2
- Side bar can now be collapsed 
- Loading screen now has centered spinning wheal with loading text underneath
- add bookmarks now filters out folders that don't have manga urls
- add bookmarks now has dedicated screen for seeing errors and going back to add more folders
- add manga, remove, and add bookmarks now prevents clicking add button multiple times
- new stats! new manga(user added manga) in last 30 days, new chapters in last 30 days(chapters released on already tracked manga)
- tracked chapters global now is calculated and displayed
- statistics now gives error when its unable to load
- an error is shown when manga is unable to be fetched for view tracked or if you have no manga added
- view tracked cards are now centered 
- view tracked overview titles are now larger and can cut off but have a tooltip when hovered over
- you can now click on github on home to open my github page
- github page now opens correct repo
- settings for custom cats now prevents only spaces, extra spaces at beg and end, prevents 0 width ascii, and prevents duplicate categories names. 
- table for user cats shouldn't move anymore when you click new cat button
- new sql for converting db to use primary keys and types reducing query time (note you will need to run `npm run changeKey` in `puppeteerServer/packages/server` and change dev-manga-bot to name of your db)
- new stats table used to calculate some of the new stats
- getUserManga is now optimized and fasted by batching statements 
- fixed verifyIndexRange function to return last index when provided index is greater than lists length
- puppeteer now uses fastify instead of express
- update parameter added to puppeteer scraping scripts to bypass getChapterIndex
- puppeteer server now only returns manga that has new chapters
- puppeteer server calculates stats for how many new chapters per update
- puppeteer server packages updated
- changed image selector for asura
- added catches in case chapter url list and chapter text list length don't match or are 0
- updated image selector in reaper-scans
- added support for mangadex
- resolved manga with only 1 saved chapter being unable to update
- added Accordion to settings. this will allow more settings to be added in the future while keeping the settings page manageable. 
- added new test version of categories settings under its own dropdown(Categories V2)
- created new version of ReaperScans scrapper that supports new webpage
- ReaperScans config now defaults to on
- modified block lists for all scraping scripts reducing how long it takes to pull data. 
- on home page you can now click on the different supported sites and be brought to their homepage. 


## Change Log 1.1.1
- password on puppeteer server is now properly uses
- add manga now sends server password to verify to puppeteer server
- view tracked now has a catch for when user current index for a manga is out of bounds(can happen when a chapter is removed)
- added catch for when user current index for a manga is out of bounds in pull user stats(can happen when a chapter is removed)

## Change Log 1.1.0
- Server-Server com now has a password that must match for servers to communicate
- You now need server password to use auth id instead of access token
- Routes now have icons corresponding to what they are
- loading screen is now dark and has a spinning wheel as well as large centered text
- users can now create their own categories
- some types are now moved to dedicated file
- some variables now have own file instead of constantly being redefined
- userData is renamed to userInfo
- new table for storing user settings(currently only categories)
- Stats screen global stats have been changed to Total tracked manga, Total tracked Chapters, and 2 TBD
- new page for viewing all user tracked manga and manage them
- new settings screen (currently only used for categories)
- verifying users has been moved to dedicated function that handles getting user ID or returning error message
- resolves changeMangaCat not always changing the category
- commented out code in service worker as it caused issue deploying and wasn't used. 
- puppeteer server has been changed to use typescript
- resolved issue where when manga failed to pull during update none of the data was saved
- added option for verbose logging in puppeteer server
- updated asura pull utils for the new webpage
- created new util for converting old asura links to new ones
- utils now has config file instead of hard coded values 

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