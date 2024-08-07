DROP TABLE IF EXISTS userData;
DROP TABLE IF EXISTS mangaData;
DROP TABLE IF EXISTS userSettings;
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
CREATE TABLE IF NOT EXISTS userSettings (
    userID TEXT PRIMARY KEY,
    categories
);