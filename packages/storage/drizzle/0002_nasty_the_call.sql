CREATE TABLE `guess_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`epd` text NOT NULL,
	`answer` text NOT NULL,
	`result` text NOT NULL,
	`ms_to_answer` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guess_attempts_at_idx` ON `guess_attempts` (`at`);