CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_locations" (
	"employee_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "employee_locations_employee_id_location_id_pk" PRIMARY KEY("employee_id","location_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_roles" (
	"employee_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "employee_roles_employee_id_role_id_pk" PRIMARY KEY("employee_id","role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"role_id" uuid,
	"location_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
-- ALTER TABLE "employee_locations" ADD CONSTRAINT "employee_locations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employee_locations" ADD CONSTRAINT "employee_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employee_roles" ADD CONSTRAINT "employee_roles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employee_roles" ADD CONSTRAINT "employee_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "shifts" ADD CONSTRAINT "shifts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;

-- Add GiST extension if not exists
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add GiST exclusion constraint to prevent double-booking for the same employee
-- ALTER TABLE "shifts"
--  ADD CONSTRAINT "no_double_booking"
--  EXCLUDE USING gist (
--    employee_id WITH =,
--    tstzrange(starts_at, ends_at) WITH &&
--  );

-- Seed demo data
-- INSERT INTO companies (id, name) VALUES
--  ('00000000-0000-0000-0000-000000000001', 'Demo Company');

-- INSERT INTO roles (id, company_id, name) VALUES
--  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Cashier'),
--  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Stocker');

-- INSERT INTO locations (id, company_id, name) VALUES
--  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Main Store'),
--  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Warehouse');

-- Demo users must exist in public.users (created via Supabase signup/trigger)
-- For demo, assume these users exist:
--   00000000-0000-0000-0000-000000000301 (Alice)
--   00000000-0000-0000-0000-000000000302 (Bob)
--   00000000-0000-0000-0000-000000000303 (Charlie)

-- INSERT INTO employees (id, company_id, user_id, name) VALUES
--  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'Alice'),
--  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000302', 'Bob'),
--  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000303', 'Charlie');

-- INSERT INTO employee_roles (employee_id, role_id) VALUES
--  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101'),
--  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102'),
--  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000101');

-- INSERT INTO employee_locations (employee_id, location_id) VALUES
--  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201'),
--  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202'),
--  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000201');

-- INSERT INTO shifts (id, company_id, employee_id, role_id, location_id, starts_at, ends_at) VALUES
--  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', '2024-06-10T09:00:00+00', '2024-06-10T17:00:00+00'),
--  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202', '2024-06-10T10:00:00+00', '2024-06-10T18:00:00+00');