PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_plays` (
	`played_at` integer NOT NULL,
	`played_by` text NOT NULL,
	`is_random` integer NOT NULL,
	`meme_id` text,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_plays`("played_at", "played_by", "is_random", "meme_id") SELECT "played_at", "played_by", "is_random", "meme_id" FROM `plays`;--> statement-breakpoint
DROP TABLE `plays`;--> statement-breakpoint
ALTER TABLE `__new_plays` RENAME TO `plays`;--> statement-breakpoint
PRAGMA foreign_keys=ON;