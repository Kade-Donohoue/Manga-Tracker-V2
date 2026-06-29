CREATE TABLE `userRequests` (
	`requestID` text,
	`userID` text NOT NULL,
	`mangaId` text NOT NULL,
	`type` text NOT NULL,
	`submittedTime` integer NOT NULL,
	`completedTime` integer,
	`status` text NOT NULL,
	`notes` text,
	PRIMARY KEY(`userID`, `requestID`),
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
