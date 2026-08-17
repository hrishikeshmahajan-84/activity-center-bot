CREATE TABLE "activity_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_name" text NOT NULL,
	"level" text NOT NULL,
	"registration_date" date,
	"check_window_start" text DEFAULT '09:00',
	"check_window_end" text DEFAULT '11:00',
	"class_day" text,
	"class_time" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminder_sent_for_window" text
);
--> statement-breakpoint
CREATE TABLE "booking_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_id" integer,
	"activity_name" text NOT NULL,
	"level" text NOT NULL,
	"outcome" text NOT NULL,
	"confirmation_number" text,
	"class_date" text,
	"class_time" text,
	"notes" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_key" text NOT NULL,
	"activity_name" text NOT NULL,
	"level" text,
	"status" text NOT NULL,
	"alert_pending" boolean DEFAULT false NOT NULL,
	"alert_claimed_at" timestamp with time zone,
	"last_alert_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_status_activity_key_unique" UNIQUE("activity_key")
);
