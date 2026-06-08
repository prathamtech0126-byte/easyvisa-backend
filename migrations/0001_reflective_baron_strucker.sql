CREATE TABLE "spouse_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"spouse_name" text,
	"permit_type" text,
	"duration_information" text,
	"noc_level" text,
	"canada_funds" text,
	"india_funds" text,
	"credits" text,
	"marriage_duration" text,
	"eligibility_score" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp DEFAULT now()
);
