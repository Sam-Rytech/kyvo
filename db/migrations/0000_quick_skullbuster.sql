CREATE TABLE "cache_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"namespace" text NOT NULL,
	"type" text NOT NULL,
	"merchant" text,
	"event_date" text,
	"sentence" text NOT NULL,
	"event" jsonb NOT NULL,
	"blob_id" text NOT NULL,
	"written_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "drain_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"locked_until" timestamp with time zone DEFAULT 'epoch' NOT NULL,
	"blocked_until" timestamp with time zone DEFAULT 'epoch' NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT 'epoch' NOT NULL,
	"window_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"namespace" text NOT NULL,
	"text" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"batch_key" text,
	"job_id" text,
	"blob_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_cursors" (
	"user_id" text PRIMARY KEY NOT NULL,
	"page_token" text,
	"done" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seen_messages" (
	"user_id" text NOT NULL,
	"message_hash" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seen_messages_user_id_message_hash_pk" PRIMARY KEY("user_id","message_hash")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"home_currency" text DEFAULT 'NGN' NOT NULL,
	"providers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vault_address" text,
	"telegram_chat_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cache_events_blob" ON "cache_events" USING btree ("blob_id");--> statement-breakpoint
CREATE INDEX "cache_events_user_type" ON "cache_events" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idempotency_key" ON "outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_status" ON "outbox" USING btree ("status","id");