CREATE TABLE "notifications" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_user_id_key_pk" PRIMARY KEY("user_id","key")
);
