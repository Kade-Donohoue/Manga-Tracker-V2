CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `apikey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start` text NOT NULL,
	`prefix` text NOT NULL,
	`key` text NOT NULL,
	`userId` text NOT NULL,
	`refillInterval` integer,
	`refillAmount` integer,
	`lastRefillAt` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`rateLimitEnabled` integer DEFAULT false NOT NULL,
	`rateLimitTimeWindow` integer,
	`rateLimitMax` integer,
	`requestCount` integer DEFAULT 0,
	`remaining` integer,
	`lastRequest` integer,
	`expiresAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`permissions` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `coverImages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mangaId` text NOT NULL,
	`coverIndex` integer NOT NULL,
	`savedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`mangaId`) REFERENCES `mangaData`(`mangaId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coverImage_Unique` ON `coverImages` (`mangaId`,`coverIndex`);--> statement-breakpoint
CREATE TABLE `dailyUserStats` (
	`userID` text NOT NULL,
	`date` text NOT NULL,
	`totalCurrentChapters` real NOT NULL,
	`totalLatestChapters` real NOT NULL,
	`backlog` real NOT NULL,
	`pastMonthReads` real NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`userID`, `date`)
);
--> statement-breakpoint
CREATE TABLE `friends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`senderId` text NOT NULL,
	`receiverId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sentAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`respondedAt` text,
	FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiverId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friends_unique` ON `friends` (`senderId`,`receiverId`);--> statement-breakpoint
CREATE TABLE `globalDailyStats` (
	`date` text PRIMARY KEY NOT NULL,
	`mangaTracked` integer NOT NULL,
	`newChapters30` integer NOT NULL,
	`newManga30` integer NOT NULL,
	`totalChaptersTracked` integer NOT NULL,
	`totalChaptersRead` integer NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`chaptersRead30` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mangaData` (
	`mangaId` text PRIMARY KEY NOT NULL,
	`mangaName` text NOT NULL,
	`urlBase` text NOT NULL,
	`slugList` text NOT NULL,
	`chapterTextList` text NOT NULL,
	`latestChapterText` real NOT NULL,
	`updateTime` text NOT NULL,
	`useAltStatCalc` integer DEFAULT false NOT NULL,
	`specialFetchData` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mangaData_urlBase_unique` ON `mangaData` (`urlBase`);--> statement-breakpoint
CREATE TABLE `mangaStats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`mangaId` text,
	`value` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recommenderId` text NOT NULL,
	`mangaId` text NOT NULL,
	`receiverId` text NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recommenderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiverId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recommend_Unique` ON `recommendations` (`recommenderId`,`receiverId`,`mangaId`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`timezone` text,
	`city` text,
	`country` text,
	`region` text,
	`region_code` text,
	`colo` text,
	`latitude` text,
	`longitude` text,
	`impersonatedBy` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`is_anonymous` integer,
	`role` text DEFAULT 'user' NOT NULL,
	`banned` integer,
	`banReason` text,
	`banExpires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `userCategories` (
	`userID` text NOT NULL,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`color` text NOT NULL,
	`stats` integer DEFAULT true NOT NULL,
	`public` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`userID`, `value`),
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `userData` (
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
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `userStats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`mangaId` text NOT NULL,
	`userID` text NOT NULL,
	`value` real NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
