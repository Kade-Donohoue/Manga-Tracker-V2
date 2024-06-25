# Manga Tracker V2
 Tracks manga using puppeteer. Uses discord activities and commands for user interface. 

# Parts
Each folder is a seperate part of the bot and it has 3 main parts. 
1. the activity which handles interacting with databases as well as providing the activity. 
2. The puppeteer server. This handles fetching all manga data from websites and needs to be run locally 
3. The Text Command server. This is made to run locally and proccesses commands fetches required data from activity backend as well as create images for the user. 
4. the utils folder contains some tools primarly converting old manga bot db to new system

the first 2 are required while the text command is optional. Each folder has its own readme with setup instructions. 

