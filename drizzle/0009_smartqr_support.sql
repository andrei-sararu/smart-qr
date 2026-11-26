CREATE TABLE `smartqr_tickets` (`id` text PRIMARY KEY NOT NULL, `owner_id` text NOT NULL, `subject` text NOT NULL, `category` text NOT NULL, `status` text NOT NULL, `priority` text NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `smartqr_tickets_lookup` ON `smartqr_tickets` (`owner_id`);
--> statement-breakpoint
CREATE TABLE `smartqr_ticket_messages` (`id` text PRIMARY KEY NOT NULL, `ticket_id` text NOT NULL, `author_id` text NOT NULL, `author_type` text NOT NULL, `body` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `smartqr_ticket_messages_lookup` ON `smartqr_ticket_messages` (`ticket_id`);
