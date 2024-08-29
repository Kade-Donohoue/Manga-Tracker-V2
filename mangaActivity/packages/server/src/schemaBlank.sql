DROP TABLE IF EXISTS userData;
DROP TABLE IF EXISTS mangaData;
DROP TABLE IF EXISTS userSettings;
DROP TABLE IF EXISTS stats;

CREATE TABLE IF NOT EXISTS userData (
    userID TEXT NOT NULL,
    mangaName TEXT NOT NULL,
    mangaId TEXT NOT NULL,
    currentIndex INTEGER NOT NULL,
    userCat TEXT NOT NULL,
    interactTime INTEGER NOT NULL,
    PRIMARY KEY (userID, mangaId)
);
CREATE TABLE IF NOT EXISTS mangaData (
    mangaId TEXT PRIMARY KEY NOT NULL,
    mangaName TEXT NOT NULL,
    urlList TEXT NOT NULL,
    chapterTextList TEXT NOT NULL,
    updateTime TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS userSettings (
    userID TEXT NOT NULL PRIMARY KEY,
    categories TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stats (
    "timestamp" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "stat_value" INTEGER NOT NULL
);