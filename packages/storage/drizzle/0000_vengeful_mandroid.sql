CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`opening_id` text NOT NULL,
	`epd` text NOT NULL,
	`expected_uci` text NOT NULL,
	`due` text NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` text NOT NULL,
	`last_review` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cards_due_idx` ON `cards` (`due`);--> statement-breakpoint
CREATE INDEX `cards_opening_idx` ON `cards` (`opening_id`);--> statement-breakpoint
CREATE TABLE `eval_cache` (
	`epd` text NOT NULL,
	`depth` integer NOT NULL,
	`multipv` integer NOT NULL,
	`engine` text NOT NULL,
	`cp` integer,
	`mate` integer,
	`pv` text NOT NULL,
	`at` text NOT NULL,
	PRIMARY KEY(`epd`, `depth`, `multipv`, `engine`)
);
--> statement-breakpoint
CREATE TABLE `explorer_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`epd` text NOT NULL,
	`db` text NOT NULL,
	`speeds` text NOT NULL,
	`ratings` text NOT NULL,
	`white` integer NOT NULL,
	`draws` integer NOT NULL,
	`black` integer NOT NULL,
	`moves` text NOT NULL,
	`opening_name` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`at` text NOT NULL,
	`answer` text NOT NULL,
	`matched` integer NOT NULL,
	`ms_to_answer` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quiz_attempts_quiz_idx` ON `quiz_attempts` (`quiz_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`at` text NOT NULL,
	`rating` text NOT NULL,
	`played_uci` text,
	`ms_to_answer` integer NOT NULL,
	`hint_used` integer NOT NULL,
	`session_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_card_idx` ON `reviews` (`card_id`);--> statement-breakpoint
CREATE INDEX `reviews_at_idx` ON `reviews` (`at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`at` text NOT NULL
);
