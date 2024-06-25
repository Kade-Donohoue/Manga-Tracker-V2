const sqlite3 = require("sqlite3").verbose()
const serverURL = "enter_worker_url_here"

let sql
const data = new sqlite3.Database('manga.db',sqlite3.OPEN_READWRITE,(err)=>{
    if (err) return console.error(err.message);
})

async function main() {
    sql = `SELECT * FROM userData`
    data.all(sql, [], async (err, rows) => {
        for (var i = 0; i < rows.length; i++) {
            const id = rows[i].userID
            const url = rows[i].current
            const cat = rows[i].userCat
            // console.log(id, url, cat)

            const reply = await fetch(`${serverURL}/api/data/add/addManga`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "access_token": "null",
                    "authId": id,
                    "userCat": cat,
                    "url": url
                }),
            })
            if (reply.status!=200) console.warn(`Issue Saving ${url} for ${id}`)
            else {
                const returnData = await reply.json()
                console.log(`saved ${url} with id ${returnData.message}`)
            }
        }
        console.log('complete')
    })
    
}

main()