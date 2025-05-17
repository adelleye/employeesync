CREATE TABLE "item_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"message" text,
	"triggering_qty" integer NOT NULL,
	"reorder_point_at_trigger" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
-- DROP INDEX "company_user_idx";--> statement-breakpoint
-- DROP INDEX "company_sku_idx";--> statement-breakpoint
ALTER TABLE "item_alerts" ADD CONSTRAINT "item_alerts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_alerts" ADD CONSTRAINT "item_alerts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employees_company_user_uidx" ON "employees" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_company_id_idx" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "items_company_sku_idx" ON "items" USING btree ("company_id","sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_company_id_idx" ON "items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_name_idx" ON "items" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_location_id_idx" ON "items" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_company_id_idx" ON "locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_name_idx" ON "locations" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_company_id_idx" ON "roles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_company_id_idx" ON "shifts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_starts_at_idx" ON "shifts" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_employee_id_idx" ON "shifts" USING btree ("employee_id");