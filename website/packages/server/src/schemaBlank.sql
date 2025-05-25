DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS userData;
DROP TABLE IF EXISTS mangaData;
DROP TABLE IF EXISTS userCategories;
DROP TABLE IF EXISTS stats;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    userID TEXT NOT NULL PRIMARY KEY,
    userName TEXT NOT NULL,
    imageURl TEXT,
    createdAt TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS userData (
    userID TEXT NOT NULL,
    mangaId TEXT NOT NULL,
    currentIndex INTEGER NOT NULL,
    currentChap REAL NOT NULL,
    userCat TEXT NOT NULL,
    interactTime INTEGER NOT NULL,
    PRIMARY KEY (userID, mangaId),

    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mangaData (
    mangaId TEXT PRIMARY KEY NOT NULL,
    mangaName TEXT NOT NULL,
    urlBase TEXT NOT NULL,
    slugList TEXT NOT NULL,
    chapterTextList TEXT NOT NULL,
    latestChapterText REAL NOT NULL,
    updateTime TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS userCategories (
    userID TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    color TEXT NOT NULL,
    stats BOOLEAN NOT NULL DEFAULT TRUE,
    public BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL,

    PRIMARY KEY (userID, value),
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stats (
    "timestamp" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "stat_value" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respondedAt TIMESTAMP NULL,

    FOREIGN KEY (senderId) REFERENCES users(userID) ON DELETE CASCADE,
    FOREIGN KEY (receiverId) REFERENCES users(userID) ON DELETE CASCADE,

    UNIQUE (senderId, receiverId)
);
