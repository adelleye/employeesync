CREATE TABLE IF NOT EXISTS "employee_roles" (
	"employee_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "employee_roles_employee_id_role_id_pk" PRIMARY KEY("employee_id","role_id")
);
--> statement-breakpoint
-- DROP TABLE IF EXISTS "shift_templates" CASCADE;--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_location_id_locations_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "shift_company_timerange_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "shift_employee_timerange_idx";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "location_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- ALTER TABLE "employee_roles" ADD CONSTRAINT "employee_roles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employee_roles" ADD CONSTRAINT "employee_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_user_idx" ON "employees" USING btree ("company_id","user_id");--> statement-breakpoint
ALTER TABLE "shifts" DROP COLUMN IF EXISTS "role_id";