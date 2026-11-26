CREATE TABLE `smartqr_links` (`id` text PRIMARY KEY NOT NULL, `owner_id` text NOT NULL, `label` text NOT NULL, `destination` text NOT NULL, `enabled` integer DEFAULT 1 NOT NULL, `scans` integer DEFAULT 0 NOT NULL, `revision` integer DEFAULT 0 NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `smartqr_owner_idx` ON `smartqr_links` (`owner_id`);
