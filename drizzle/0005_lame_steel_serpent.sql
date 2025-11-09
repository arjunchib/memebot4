CREATE TABLE `plays` (
	`played_at` integer NOT NULL,
	`played_by` text NOT NULL,
	`is_random` integer NOT NULL,
	`meme_id` text NOT NULL,
	FOREIGN KEY (`meme_id`) REFERENCES `memes`(`id`) ON UPDATE cascade ON DELETE no action
);
