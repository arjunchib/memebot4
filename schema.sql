CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			);
CREATE TABLE `commands` (
	`name` text PRIMARY KEY NOT NULL,
	`meme_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE cascade
) STRICT;
CREATE TABLE `meme_tags` (
	`meme_id` text NOT NULL,
	`tag_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`meme_id`, `tag_name`),
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tag_name`) REFERENCES `tags`(`name`) ON UPDATE cascade ON DELETE cascade
) STRICT;
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
, `source_url` text, `start` text, `end` text) STRICT;
CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS "kv" (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
, `exp` integer);
CREATE TABLE IF NOT EXISTS "plays" (
	`played_at` integer NOT NULL,
	`played_by` text NOT NULL,
	`is_random` integer NOT NULL,
	`meme_id` text,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE set null
);
CREATE TABLE IF NOT EXISTS "transcriptions" (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	`text` text NOT NULL,
	"json" text,
	`is_human` integer NOT NULL,
	`meme_id` text,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE cascade
);
CREATE UNIQUE INDEX `transcriptions_meme_id_unique` ON `transcriptions` (`meme_id`);
