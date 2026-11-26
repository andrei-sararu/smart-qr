CREATE TABLE `smartqr_marketing` (`email` text PRIMARY KEY NOT NULL, `status` text NOT NULL, `source` text NOT NULL, `consent_version` text NOT NULL, `consent_text` text NOT NULL, `requested_at` integer NOT NULL, `updated_at` integer NOT NULL, `confirmed_at` integer, `unsubscribed_at` integer, `confirm_hash` text, `confirm_expires` integer, `unsubscribe_hash` text);
--> statement-breakpoint
CREATE UNIQUE INDEX `smartqr_confirm_idx` ON `smartqr_marketing` (`confirm_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `smartqr_unsubscribe_idx` ON `smartqr_marketing` (`unsubscribe_hash`);
