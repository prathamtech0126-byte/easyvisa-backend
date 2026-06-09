CREATE INDEX IF NOT EXISTS "submissions_email_idx" ON "submissions" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_phone_idx" ON "submissions" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spouse_submissions_email_idx" ON "spouse_submissions" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spouse_submissions_phone_idx" ON "spouse_submissions" ("phone");
