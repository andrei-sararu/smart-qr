CREATE TABLE `smartqr_campaigns` (`id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `subject` text NOT NULL, `body` text NOT NULL, `segment` text NOT NULL, `status` text NOT NULL, `scheduled_at` integer, `created_by` text NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, `revision` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `smartqr_workflow_runs` (`id` text PRIMARY KEY NOT NULL, `rule` text NOT NULL, `entity_id` text NOT NULL, `created_at` integer NOT NULL);
