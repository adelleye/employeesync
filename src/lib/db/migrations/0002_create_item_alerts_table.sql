CREATE TABLE IF NOT EXISTS "item_alerts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "item_id" uuid NOT NULL,
    "company_id" uuid NOT NULL,
    "message" text,
    "triggering_qty" integer NOT NULL,
    "reorder_point_at_trigger" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "resolved_at" timestamp with time zone,
    "acknowledged_at" timestamp with time zone,
    CONSTRAINT "item_alerts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "item_alerts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "item_alerts_item_id_idx" ON "item_alerts" ("item_id");
CREATE INDEX IF NOT EXISTS "item_alerts_company_id_idx" ON "item_alerts" ("company_id");
-- This index specifically optimizes the check for open alerts in the trigger function.
CREATE INDEX IF NOT EXISTS "item_alerts_open_alerts_idx" ON "item_alerts" ("item_id") WHERE "resolved_at" IS NULL; 