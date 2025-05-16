CREATE TABLE IF NOT EXISTS "shift_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role_id" uuid,
	"location_id" uuid,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ALTER TABLE "employee_roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- DROP TABLE "employee_roles" CASCADE;--> statement-breakpoint
-- ALTER TABLE "locations" DROP CONSTRAINT IF EXISTS "locations_company_id_companies_id_fk";
-- --> statement-breakpoint
-- ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_company_id_companies_id_fk";
-- --> statement-breakpoint
-- ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_company_id_companies_id_fk";
-- --> statement-breakpoint
-- ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_employee_id_employees_id_fk";
-- --> statement-breakpoint
-- ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_role_id_roles_id_fk";
-- --> statement-breakpoint
-- ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_location_id_locations_id_fk";
-- --> statement-breakpoint
-- ALTER TABLE "shifts" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
-- ALTER TABLE "shifts" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
-- ALTER TABLE "shifts" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
-- ALTER TABLE "shifts" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
-- ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "role_id" uuid;--> statement-breakpoint
-- ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
-- ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_template_company_name_idx" ON "shift_templates" USING btree ("company_id","name");--> statement-breakpoint
-- ALTER TABLE "employees" ADD CONSTRAINT "employees_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_company_timerange_idx" ON "shifts" USING btree ("company_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_employee_timerange_idx" ON "shifts" USING btree ("employee_id","starts_at","ends_at");