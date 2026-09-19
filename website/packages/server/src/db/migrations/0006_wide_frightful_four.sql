CREATE INDEX `coverImage_SavedAt_Index` ON `coverImages` (`savedAt`,`mangaId`,`coverIndex`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_dailyUserStats` (
	`userID` text NOT NULL,
	`date` text NOT NULL,
	`totalCurrentChapters` real NOT NULL,
	`totalLatestChapters` real NOT NULL,
	`backlog` real NOT NULL,
	`pastMonthReads` real NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`userID`, `date`),
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_dailyUserStats`("userID", "date", "totalCurrentChapters", "totalLatestChapters", "backlog", "pastMonthReads", "updatedAt") SELECT "userID", "date", "totalCurrentChapters", "totalLatestChapters", "backlog", "pastMonthReads", "updatedAt" FROM `dailyUserStats`;--> statement-breakpoint
DROP TABLE `dailyUserStats`;--> statement-breakpoint
ALTER TABLE `__new_dailyUserStats` RENAME TO `dailyUserStats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recommenderId` text NOT NULL,
	`mangaId` text NOT NULL,
	`receiverId` text NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recommenderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mangaId`) REFERENCES `mangaData`(`mangaId`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiverId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_recommendations`("id", "recommenderId", "mangaId", "receiverId", "message", "status", "createdAt") SELECT "id", "recommenderId", "mangaId", "receiverId", "message", "status", "createdAt" FROM `recommendations`;--> statement-breakpoint
DROP TABLE `recommendations`;--> statement-breakpoint
ALTER TABLE `__new_recommendations` RENAME TO `recommendations`;--> statement-breakpoint
CREATE UNIQUE INDEX `recommend_Unique` ON `recommendations` (`recommenderId`,`receiverId`,`mangaId`);--> statement-breakpoint
CREATE TABLE `__new_subscriptions` (
	`id` text NOT NULL,
	`userID` text NOT NULL,
	`endpoint` text NOT NULL,
	`expirationTime` integer,
	`keys` jsonb NOT NULL,
	PRIMARY KEY(`userID`, `id`),
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_subscriptions`("id", "userID", "endpoint", "expirationTime", "keys") SELECT "id", "userID", "endpoint", "expirationTime", "keys" FROM `subscriptions`;--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
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
	FOREIGN KEY (`mangaId`) REFERENCES `mangaData`(`mangaId`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_userData`("userID", "mangaId", "userTitle", "currentIndex", "currentChap", "userCat", "interactTime", "addedAt", "userCoverIndex") SELECT "userID", "mangaId", "userTitle", "currentIndex", "currentChap", "userCat", "interactTime", "addedAt", "userCoverIndex" FROM `userData`;--> statement-breakpoint
DROP TABLE `userData`;--> statement-breakpoint
ALTER TABLE `__new_userData` RENAME TO `userData`;--> statement-breakpoint
CREATE TABLE `__new_userRequests` (
	`requestID` text,
	`userID` text NOT NULL,
	`mangaId` text NOT NULL,
	`type` text NOT NULL,
	`submittedTime` integer NOT NULL,
	`completedTime` integer,
	`status` text NOT NULL,
	`notes` text,
	PRIMARY KEY(`userID`, `requestID`),
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mangaId`) REFERENCES `mangaData`(`mangaId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_userRequests`("requestID", "userID", "mangaId", "type", "submittedTime", "completedTime", "status", "notes") SELECT "requestID", "userID", "mangaId", "type", "submittedTime", "completedTime", "status", "notes" FROM `userRequests`;--> statement-breakpoint
DROP TABLE `userRequests`;--> statement-breakpoint
ALTER TABLE `__new_userRequests` RENAME TO `userRequests`;--> statement-breakpoint
CREATE TABLE `__new_userStats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`mangaId` text NOT NULL,
	`userID` text NOT NULL,
	`value` real NOT NULL,
	FOREIGN KEY (`mangaId`) REFERENCES `mangaData`(`mangaId`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_userStats`("id", "type", "timestamp", "mangaId", "userID", "value") SELECT "id", "type", "timestamp", "mangaId", "userID", "value" FROM `userStats`;--> statement-breakpoint
DROP TABLE `userStats`;--> statement-breakpoint
ALTER TABLE `__new_userStats` RENAME TO `userStats`;