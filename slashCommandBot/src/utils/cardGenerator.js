const { AttachmentBuilder } = require("discord.js")
const config = require('../../data/config.json')
const Canvas = require('canvas')


/**
 * Generates Card
 * @param {string} name: Name of the Manga
 * @param {string} latest: Text for latest Chapter
 * @param {string} current: Text for current Chapter
 * @param {string} next: Text for next Chapter
 * @param {string} total: Text for total amount of Chapters
 * @param {string} updateTime: Text for the last time the data was updated
 * @param {string} mangaId: id of the manga. 
 * @returns buffer of image data
 */
async function generateCard(name, latest, current, next, total, updateTime, mangaId) {
    try {
        if (name.length > 30) {
            name = name.substring(0, 30) + '...'
        }
        if (!next) next = latest

        latest = latest.charAt(0).toUpperCase() + latest.slice(1)
        next = next.charAt(0).toUpperCase() + next.slice(1)
        const canvas = Canvas.createCanvas(1643, 1425)
        const context = canvas.getContext('2d')
        const template = await Canvas.loadImage('data/template/cardTemplate.png')
        context.drawImage(template, 0, 0, canvas.width, canvas.height)
        context.font = applyText(canvas, name, 1400);
        context.fillStyle = '#D0D3D6';
        context.textAlign = "center"
        context.fillText(name, canvas.width / 2, 130);
        context.fillStyle = '#A8ABAE';
        context.font = applyText(canvas, latest, 400);
        context.fillText(latest, 410, 425);
        context.font = applyText(canvas, current, 400);
        context.fillText(current, 410, 670);
        context.font = applyText(canvas, next, 400);
        context.fillText(next, 410, 900);
        context.font = applyText(canvas, total, 400);
        context.fillText(total, 410, 1130);
        context.textAlign = "left"
        context.font = applyText(canvas, updateTime, 600);
        context.fillText(updateTime, 100, 1365);
        const x = 890
        const y = 230
        const radius = 30
        const width = 655
        const height = 950
        // context.strokeStyle = "red";
        context.beginPath()
        context.moveTo(x + radius, y)
        context.lineTo(x + width - radius, y)
        context.quadraticCurveTo(x + width, y, x + width, y + radius)
        context.lineTo(x + width, y + height - radius)
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
        context.lineTo(x + radius, y + height)
        context.quadraticCurveTo(x, y + height, x, y + height - radius)
        context.lineTo(x, y + radius)
        context.quadraticCurveTo(x, y, x + radius, y)
        context.closePath()
        context.clip()
        
        // console.log('`data/icons/'+name.replace(/[^a-zA-Z]+/g, "")+'.png')
        var poster = await Canvas.loadImage(`${config.imageUrlBase}/${mangaId}`)//old: "data:image/ping;base64,"+iconData
        // Image.src = iconData
        // const banner = await Canvas.loadImage('data/icons/'+name.replace(/[^a-zA-Z]+/g, "")+'.png')
        context.drawImage(poster, x, y, width, height)
        context.restore()
        const attachment = new AttachmentBuilder(await canvas.toBuffer('image/png'), { name: `${name}-card.png`})
        
        return canvas.toBuffer('image/png')
    } catch (err) {
        console.warn(err)
        return null
    }
}


/**
 * Generates Card
 * @param {string} userName: Name of the user
 * @param {string} mangaRead: Text for amount of mangas tracked
 * @param {string} chaptersRead: Text for Amount of chapters read
 * @param {string} mangaUnread: Text for amount of chapters that have unread chapters
 * @param {string} chaptersUnread: Text for total unread Chapters
 * @param {string} updateTime: Time the card was requested
 * @returns buffer of image data
 */
async function generateUserStatCard(userName, mangaRead, chaptersRead, mangaUnread, chaptersUnread, updateTime) {
    mangaRead = mangaRead.charAt(0).toUpperCase() + mangaRead.slice(1)
    chaptersRead = chaptersRead.charAt(0).toUpperCase() + chaptersRead.slice(1)
    mangaUnread = mangaUnread.charAt(0).toUpperCase() + mangaUnread.slice(1)
    chaptersUnread = chaptersUnread.charAt(0).toUpperCase() + chaptersUnread.slice(1)
    const canvas = Canvas.createCanvas(1643, 1425)
    const context = canvas.getContext('2d')
    const template = await Canvas.loadImage('data/template/userStatCard.png')
    context.drawImage(template, 0, 0, canvas.width, canvas.height)
    context.font = applyText(canvas, userName, 1400);
    context.fillStyle = '#D0D3D6';
    context.textAlign = "center"
    context.fillText(userName, canvas.width / 2, 130);
    context.fillStyle = '#A8ABAE';
    context.font = applyText(canvas, mangaRead, 400);
    context.fillText(mangaRead, 410, 425);
    context.font = applyText(canvas, chaptersRead, 400);
    context.fillText(chaptersRead, 410, 670);
    context.font = applyText(canvas, mangaUnread, 400);
    context.fillText(mangaUnread, 410, 900);
    context.font = applyText(canvas, chaptersUnread, 400);
    context.fillText(chaptersUnread, 410, 1130);
    context.textAlign = "left"
    context.font = applyText(canvas, updateTime, 600);
    context.fillText(updateTime, 100, 1365);
    
    return canvas.toBuffer('image/png')
}


/**
 * Finds the correct font size to get text to fit in a certain width
 * @param {Canvas Instance} canvas: Canvas Instance to use
 * @param {string} text: Text to find font size of
 * @param {*} width: Max width wanted for text
 * @returns font from canvas context
 */
const applyText = (canvas, text, width) => {
    const ctx = canvas.getContext('2d')
    // console.log(ctx)

    let fontSize = 150;

    do {
        ctx.font = `${fontSize -= 10}px Hypereality, Arial`;
    } while (ctx.measureText(text).width > width)
    // console.log(ctx.measureText(text))
    return ctx.font;
}

module.exports = {
    generateCard,
    generateUserStatCard,
}