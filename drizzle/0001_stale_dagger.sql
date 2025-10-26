CREATE TABLE `keyValue` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `memes` ADD `source_url` text;