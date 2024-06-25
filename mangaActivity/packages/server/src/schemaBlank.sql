DROP TABLE IF EXISTS userData;
DROP TABLE IF EXISTS mangaData;
CREATE TABLE IF NOT EXISTS userData (
    userID,
    mangaName,
    mangaId,
    currentIndex,
    userCat,
    interactTime
);
CREATE TABLE IF NOT EXISTS mangaData (
    mangaId,
    mangaName,
    urlList,
    chapterTextList,
    updateTime
);