CREATE TABLE `authored_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`pgn` text NOT NULL,
	`at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `authored_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`manifest` text NOT NULL,
	`at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `authored_history` (
	`id` text PRIMARY KEY NOT NULL,
	`group` text NOT NULL,
	`at` text NOT NULL,
	`kind` text NOT NULL,
	`item_id` text NOT NULL,
	`before` text,
	`before_deleted_at` text,
	`undo_of` text
);
--> statement-breakpoint
CREATE INDEX `authored_history_item_idx` ON `authored_history` (`item_id`);--> statement-breakpoint
CREATE INDEX `authored_history_at_idx` ON `authored_history` (`at`);