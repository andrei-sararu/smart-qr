CREATE TABLE `smartqr_stripe_customers` (`owner_id` text PRIMARY KEY NOT NULL, `customer_id` text NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `smartqr_stripe_customer_unique` ON `smartqr_stripe_customers` (`customer_id`);
