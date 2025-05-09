import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

/**
 * Users table
 *
 * This table is intended to store public user information.
 * It is linked to Supabase's auth.users table via the id field.
 * Supabase Auth automatically creates a user in auth.users upon sign-up.
 * We will use a Supabase trigger/function to create a corresponding
 * record in this public.users table.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // This will reference auth.users.id
  email: text("email").unique(), // User's email, should be unique
  displayName: text("display_name"), // Optional display name
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Later, we will add other tables like companies, employees, shifts, etc.
// as defined in the PRD.
