CREATE TABLE `commands` (
	`name` text PRIMARY KEY NOT NULL,
	`meme_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE cascade
) STRICT;
--> statement-breakpoint
CREATE TABLE `meme_tags` (
	`meme_id` text NOT NULL,
	`tag_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`meme_id`, `tag_name`),
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tag_name`) REFERENCES `tags`(`name`) ON UPDATE cascade ON DELETE cascade
) STRICT;
--> statement-breakpoint
CREATE TABLE `memes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	`duration` real NOT NULL,
	`size` integer NOT NULL,
	`bit_rate` integer NOT NULL,
	`loudness_i` real NOT NULL,
	`loudness_lra` real NOT NULL,
	`loudness_tp` real NOT NULL,
	`loudness_thresh` real NOT NULL,
	`author_id` text,
	`play_count` integer DEFAULT 0 NOT NULL,
	`random_play_count` integer DEFAULT 0 NOT NULL
) STRICT;
--> statement-breakpoint
CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL
) STRICT;
