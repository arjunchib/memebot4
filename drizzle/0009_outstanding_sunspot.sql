PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transcriptions` (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	`text` text NOT NULL,
	`tokens` text,
	`is_human` integer NOT NULL,
	`meme_id` text,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_transcriptions`("created_at", "updated_at", "text", "tokens", "is_human", "meme_id") SELECT "created_at", "updated_at", "text", "tokens", "is_human", "meme_id" FROM `transcriptions`;--> statement-breakpoint
DROP TABLE `transcriptions`;--> statement-breakpoint
ALTER TABLE `__new_transcriptions` RENAME TO `transcriptions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `transcriptions_meme_id_unique` ON `transcriptions` (`meme_id`);