PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subscriptions` (
	`id` text NOT NULL,
	`userID` text NOT NULL,
	`endpoint` text NOT NULL,
	`expirationTime` integer,
	`keys` jsonb NOT NULL,
	PRIMARY KEY(`userID`, `id`)
);
--> statement-breakpoint
INSERT INTO `__new_subscriptions`("id", "userID", "endpoint", "expirationTime", "keys") SELECT "id", "userID", "endpoint", "expirationTime", "keys" FROM `subscriptions`;--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;