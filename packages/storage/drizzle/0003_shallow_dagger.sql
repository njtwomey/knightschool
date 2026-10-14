CREATE TABLE `speed_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`course_id` text NOT NULL,
	`line_id` text NOT NULL,
	`moves` integer NOT NULL,
	`errors` integer NOT NULL,
	`total_ms` integer NOT NULL,
	`slowest_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `speed_attempts_at_idx` ON `speed_attempts` (`at`);