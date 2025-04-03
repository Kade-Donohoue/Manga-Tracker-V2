ALTER TABLE mangaData RENAME TO mangaData_old;

ALTER TABLE userData ADD currentChap REAL NOT NULL DEFAULT -1; 

CREATE TABLE IF NOT EXISTS mangaData (
    mangaId TEXT PRIMARY KEY NOT NULL,
    mangaName TEXT NOT NULL,
    urlBase TEXT NOT NULL,
    slugList TEXT NOT NULL,
    chapterTextList TEXT NOT NULL,
    updateTime TEXT NOT NULL
);

INSERT INTO mangaData (mangaId, mangaName, urlBase, slugList, chapterTextList, updateTime)
SELECT mangaId, mangaName, '', urlList, chapterTextList, updateTime FROM mangaData_old;

DROP TABLE mangaData_old;
