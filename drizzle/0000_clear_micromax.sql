CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`table_id` text NOT NULL,
	`table_number` integer NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`dedupe_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`taken_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_open_unique` ON `service_requests` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `request_restaurant_idx` ON `service_requests` (`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`menu_json` text DEFAULT '[]' NOT NULL,
	`plan` text DEFAULT 'Free' NOT NULL,
	`trial_end` integer NOT NULL,
	`stripe_customer` text,
	`stripe_subscription` text,
	`subscription_status` text,
	`subscription_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurant_owner_unique` ON `restaurants` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `restaurant_slug_unique` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE TABLE `restaurant_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`number` integer NOT NULL,
	`token` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `table_token_unique` ON `restaurant_tables` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `table_number_unique` ON `restaurant_tables` (`restaurant_id`,`number`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
