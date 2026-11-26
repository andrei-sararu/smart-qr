CREATE TABLE `smartqr_daily` (`id` text PRIMARY KEY NOT NULL, `link_id` text NOT NULL, `day` text NOT NULL, `country` text NOT NULL, `device` text NOT NULL, `hits` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `smartqr_daily_link_idx` ON `smartqr_daily` (`link_id`);
--> statement-breakpoint
CREATE TABLE `smartqr_blocks` (`link_id` text PRIMARY KEY NOT NULL, `reason` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `smartqr_abuse` (`id` text PRIMARY KEY NOT NULL, `link_id` text NOT NULL, `category` text NOT NULL, `status` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `smartqr_abuse_link_idx` ON `smartqr_abuse` (`link_id`);
