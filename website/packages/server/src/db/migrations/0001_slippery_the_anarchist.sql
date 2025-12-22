DROP INDEX `mangaData_urlBase_unique`;--> statement-breakpoint
ALTER TABLE `mangaData` ADD `sourceId` text;--> statement-breakpoint
CREATE UNIQUE INDEX `mangaData_sourceId_unique` ON `mangaData` (`sourceId`);