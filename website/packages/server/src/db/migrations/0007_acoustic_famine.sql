PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_coverImages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mangaId` text NOT NULL,
	`coverIndex` integer NOT NULL,
	`savedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`mangaId`) REFERENCES `mangaData`(`mangaId`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_coverImages`("id", "mangaId", "coverIndex", "savedAt") SELECT "id", "mangaId", "coverIndex", "savedAt" FROM `coverImages`;--> statement-breakpoint
DROP TABLE `coverImages`;--> statement-breakpoint
ALTER TABLE `__new_coverImages` RENAME TO `coverImages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `coverImage_SavedAt_Index` ON `coverImages` (`savedAt`,`mangaId`,`coverIndex`);--> statement-breakpoint
CREATE UNIQUE INDEX `coverImage_Unique` ON `coverImages` (`mangaId`,`coverIndex`);--> statement-breakpoint
CREATE TABLE `__new_userData` (
	`userID` text NOT NULL,
	`mangaId` text NOT NULL,
	`userTitle` text,
	`currentIndex` integer NOT NULL,
	`currentChap` text NOT NULL,
	`userCat` text NOT NULL,
	`interactTime` integer NOT NULL,
	`addedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`userCoverIndex` integer DEFAULT -1 NOT NULL,
	PRIMARY KEY(`userID`, `mangaId`),
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mangaId`) REFERENCES `mangaData`(`mangaId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_userData`("userID", "mangaId", "userTitle", "currentIndex", "currentChap", "userCat", "interactTime", "addedAt", "userCoverIndex") SELECT "userID", "mangaId", "userTitle", "currentIndex", "currentChap", "userCat", "interactTime", "addedAt", "userCoverIndex" FROM `userData`;--> statement-breakpoint
DROP TABLE `userData`;--> statement-breakpoint
ALTER TABLE `__new_userData` RENAME TO `userData`;--> statement-breakpoint
ALTER TABLE `mangaData` ADD `source` text DEFAULT 'Temp' NOT NULL;--> statement-breakpoint
ALTER TABLE `mangaData` ADD `mangaGroupId` text;