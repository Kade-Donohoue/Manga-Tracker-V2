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
