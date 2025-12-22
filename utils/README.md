# Utils

# convertOld
Intended to convert old manga bot sqlite database to new system

## how to use
1. place manga.db in same folder as file
2. run `npm install`
3. copy `config.json.example` and rename to `config.json`
4. fill in `config.json`
5. run corresponding command to run desired script found below


## Script Commands

- `npm run covertOldDB`: runs script that converts old .db over to cloudflare d1 db
- `npm run updateAsuraLinks`: runs script that converts all asura links in d1 db to newer version (as of 7/24)

an output in the console showing successes and fails with a done message after completion 

#Queue Viewer
1. run `npm i`
2. run `node .`
3. connect to localhost:5911/admin/queues


# Clerk(3.x.x) To Better-Auth(4.x.x)
This is a major update and takes some manual work to migrate. Some tools (found in `./v4migration`) have been made to make migration as easy as possible. 
All Manga data gets moved at once but a flaw in the old system allowed duplicate manga entries and these need resolved. some sql commands are generated that might be able to fix but I advise double checking it. Second for moving user Data its done one user at a time. **For Detailed instructions See readme in `./v4migration` **