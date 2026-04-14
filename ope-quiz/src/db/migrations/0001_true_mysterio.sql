ALTER TABLE "exams" ADD COLUMN "shuffle_options" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "disputed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "disputed_note" text;