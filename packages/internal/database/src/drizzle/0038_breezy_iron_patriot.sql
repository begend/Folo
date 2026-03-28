CREATE TABLE `annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`text` text,
	`color` text,
	`note` text,
	`position_data` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_annotations_entry_created` ON `annotations` (`entry_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_annotations_user_created` ON `annotations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_annotations_type` ON `annotations` (`type`);--> statement-breakpoint
CREATE INDEX `idx_annotations_synced` ON `annotations` (`synced_at`);