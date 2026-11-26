CREATE TABLE `smartqr_cards` (`id` text PRIMARY KEY NOT NULL, `owner_id` text NOT NULL, `name` text NOT NULL, `company` text NOT NULL, `role` text NOT NULL, `email` text NOT NULL, `phone` text NOT NULL, `website` text NOT NULL, `published` integer NOT NULL, `revision` integer NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `smartqr_card_owner_unique` ON `smartqr_cards` (`owner_id`);
