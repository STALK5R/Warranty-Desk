CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`customer` text NOT NULL,
	`vin` text NOT NULL,
	`data` text NOT NULL,
	`pages` text NOT NULL,
	`files` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contracts_vin` ON `contracts` (`vin`);