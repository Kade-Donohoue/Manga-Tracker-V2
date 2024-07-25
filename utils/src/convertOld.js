const sqlite3 = require("sqlite3").verbose()
const fs = require('fs')
const config = require('../config.json')

let sql
const data = new sqlite3.Database('../manga.db',sqlite3.OPEN_READWRITE,(err)=>{
    if (err) return console.error(err.message);
})

async function main() {
    sql = `SELECT * FROM userData`
    data.all(sql, [], async (err, rows) => {
        let failedSaves = []
        for (var i = 0; i < rows.length; i++) {
            const id = rows[i].userID
            const url = rows[i].current
            const cat = rows[i].userCat
            // console.log(id, url, cat)

            const reply = await fetch(`${config.serverUrl}/api/data/add/addManga`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": config.serverPassword,
                    "authId": id,
                    "userCat": cat,
                    "url": url
                }),
            })
            if (reply.status!=200) {
                failedSaves.push(`Issue Saving ${url} for ${id}`)
                console.warn(`Issue Saving ${url} for ${id}`)
            } else {
                const returnData = await reply.json()
                console.log(`saved ${url} with id ${returnData.message}`)
            }
        }
        if (failedSaves.length > 0) {
            let file = fs.createWriteStream('errors.txt')
            file.on('error', () => {console.warn("Failed to write error log")})
            failedSaves.forEach((failLine) => {file.write(failLine + '\n')})
            file.end()
            console.log('Error log written to errors.txt')
        }
        console.log('complete')
    })
    
}

main()