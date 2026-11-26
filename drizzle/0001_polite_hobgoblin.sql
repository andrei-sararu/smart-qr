ALTER TABLE `restaurants` ADD `original_language` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `billing_json` text DEFAULT '{}' NOT NULL;