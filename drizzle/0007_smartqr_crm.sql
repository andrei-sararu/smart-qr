CREATE TABLE `crm_staff` (`id` text PRIMARY KEY NOT NULL, `email` text NOT NULL, `role` text NOT NULL, `enabled` integer NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `crm_leads` (`id` text PRIMARY KEY NOT NULL, `company` text NOT NULL, `contact` text NOT NULL, `email` text NOT NULL, `stage` text NOT NULL, `source` text NOT NULL, `owner_id` text, `value_pence` integer NOT NULL, `notes` text NOT NULL, `revision` integer NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `crm_tasks` (`id` text PRIMARY KEY NOT NULL, `lead_id` text, `title` text NOT NULL, `owner_id` text, `due_at` integer, `status` text NOT NULL, `revision` integer NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `crm_audit` (`id` text PRIMARY KEY NOT NULL, `actor_id` text NOT NULL, `action` text NOT NULL, `entity_id` text NOT NULL, `created_at` integer NOT NULL);
