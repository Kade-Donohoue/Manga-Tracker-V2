CREATE TABLE IF NOT EXISTS userData_Copy (
    userID TEXT NOT NULL,
    mangaName TEXT NOT NULL,
    mangaId TEXT NOT NULL,
    currentIndex INTEGER NOT NULL,
    userCat TEXT NOT NULL,
    interactTime INTEGER NOT NULL,
    PRIMARY KEY (userID, mangaId)
);
CREATE TABLE IF NOT EXISTS mangaData_Copy (
    mangaId TEXT PRIMARY KEY NOT NULL,
    mangaName TEXT NOT NULL,
    urlList TEXT NOT NULL,
    chapterTextList TEXT NOT NULL,
    updateTime TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS userSettings_Copy (
    userID TEXT NOT NULL PRIMARY KEY,
    categories TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stats_Copy (
    "timestamp" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "stat_value" INTEGER NOT NULL
);

INSERT INTO userData_Copy (userId, mangaName, mangaId, currentIndex, userCat, interactTime)
    SELECT userId, mangaName, mangaId, currentIndex, userCat, interactTime FROM userData;
DROP TABLE userData;
ALTER TABLE userData_Copy RENAME TO userData;

INSERT INTO mangaData_Copy (mangaId, mangaName, urlList, chapterTextList, updateTime)
    SELECT mangaId, mangaName, urlList, chapterTextList, updateTime FROM mangaData;
DROP TABLE mangaData;
ALTER TABLE mangaData_Copy RENAME TO mangaData;

INSERT INTO userSettings_Copy (userID, categories)
    SELECT userID, categories FROM userSettings;
DROP TABLE userSettings;
ALTER TABLE userSettings_Copy RENAME TO userSettings;

INSERT INTO stats_Copy ("timestamp", "type", "stat_value")
    SELECT "timestamp", "type", "stat_value" FROM stats;
DROP TABLE stats;
ALTER TABLE stats_Copy RENAME TO stats;
