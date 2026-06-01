CREATE TABLE `transcriptions` (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL,
	`text` text NOT NULL,
	`tokens` text NOT NULL,
	`meme_id` text,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE cascade
);
