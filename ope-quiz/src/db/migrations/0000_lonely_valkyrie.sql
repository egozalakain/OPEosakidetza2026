CREATE TYPE "public"."exam_mode" AS ENUM('exam', 'study');--> statement-breakpoint
CREATE TYPE "public"."question_selection" AS ENUM('random', 'weak', 'topic', 'sequential');--> statement-breakpoint
CREATE TYPE "public"."timer_mode" AS ENUM('countdown', 'stopwatch', 'none');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"event" text NOT NULL,
	"username_attempted" text NOT NULL,
	"password_attempted" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"success" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"question_order" integer NOT NULL,
	"selected_answer" char(1),
	"is_correct" boolean,
	"flagged" boolean DEFAULT false,
	"time_spent_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"mode" "exam_mode" NOT NULL,
	"timer_mode" timer_mode NOT NULL,
	"timer_seconds" integer,
	"question_selection" "question_selection" NOT NULL,
	"topic_filter" varchar,
	"total_questions" integer,
	"correct_count" integer DEFAULT 0,
	"wrong_count" integer DEFAULT 0,
	"blank_count" integer DEFAULT 0,
	"raw_score" numeric,
	"penalized_score" numeric
);
--> statement-breakpoint
CREATE TABLE "question_stats" (
	"question_id" integer PRIMARY KEY NOT NULL,
	"times_shown" integer DEFAULT 0,
	"times_correct" integer DEFAULT 0,
	"times_wrong" integer DEFAULT 0,
	"times_blank" integer DEFAULT 0,
	"error_rate" numeric,
	"last_answered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"topic" varchar NOT NULL,
	"text" text NOT NULL,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text NOT NULL,
	"option_d" text NOT NULL,
	"correct_answer" char(1) NOT NULL,
	"explanation" text,
	CONSTRAINT "questions_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"key" varchar PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_stats" ADD CONSTRAINT "question_stats_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_answers_exam_id_idx" ON "exam_answers" USING btree ("exam_id");