CREATE TABLE "weekly_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"amount" numeric(19, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_budgets_amount_positive" CHECK ("weekly_budgets"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "weekly_budgets" ADD CONSTRAINT "weekly_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_budgets_user_week_unique" ON "weekly_budgets" USING btree ("user_id","week_start");