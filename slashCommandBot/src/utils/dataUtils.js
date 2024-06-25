/**
 * returns lest of next chapters
 * @param {String} mangaText: list of chapter text 
 * @param {number} currentIndex: index of current chapter
 * @param {Int} amount: amount to be returned(default 25)
 * @returns array of dictionaries that have key label and key value that has the URL
 */
function getNextList(mangaText, currentIndex, amount = 25) {
    var lastChap = currentIndex+amount
    if (lastChap > mangaText.length) lastChap = mangaText.length

    var info = []
    for (var i = currentIndex; i < lastChap; i++) {
        info.push({"label": mangaText[i], "value": i.toString()})
    }
    return info.slice(0, 25)
}


module.exports = {
    getNextList
};  