CREATE TABLE IF NOT EXISTS `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text NOT NULL,
	`endpoint` text NOT NULL,
	`expirationTime` integer,
	`keys` jsonb NOT NULL
);
