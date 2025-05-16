import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  pgEnum,
  primaryKey,
  unique,
  boolean,
  date,
  jsonb,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

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

// Companies table
export const companies = pgTable("companies", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Locations Table
export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Define Roles Table BEFORE Employees because Employees references it
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Employees table - references companies, users, and roles
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name"),
    roleId: uuid("role_id").references(() => roles.id, {
      onDelete: "set null",
    }), // References roles table
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      companyUserIndex: uniqueIndex("company_user_idx").on(
        table.companyId,
        table.userId
      ),
    };
  }
);

// EmployeeRoles join table (many-to-many)
export const employeeRoles = pgTable(
  "employee_roles",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.employeeId, t.roleId] }),
  })
);

// EmployeeLocations join table (many-to-many)
export const employeeLocations = pgTable(
  "employee_locations",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.employeeId, t.locationId] }),
  })
);

// Shifts Table - references companies, employees, locations
export const shifts = pgTable(
  "shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }), // Link to employee
    locationId: uuid("location_id").references(() => locations.id, {
      onDelete: "set null",
    }), // Optional link to location
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    notes: text("notes"), // Optional field for shift notes
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      shiftOverlapExclusion: sql`exclude using gist (employee_id with =, tstzrange(starts_at, ends_at) with &&)`,
    };
  }
);

// Shift Templates Table
export const shiftTemplates = pgTable("shift_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }),
  locationId: uuid("location_id").references(() => locations.id, {
    onDelete: "set null",
  }),
  startTime: text("start_time").notNull(), // Use text for time (HH:mm) for simplicity
  endTime: text("end_time").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Items table
export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    sku: text("sku"),
    name: text("name").notNull(),
    qtyOnHand: integer("qty_on_hand").notNull().default(0),
    reorderPoint: integer("reorder_point"),
    locationId: uuid("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // .onUpdateNow() - Drizzle ORM does not have a direct .onUpdateNow() for PG like this.
    // This needs to be handled by database triggers or application logic.
    // For now, defaultNow() on insert and application updates will manage updatedAt.
  },
  (table) => {
    return {
      companySkuIndex: uniqueIndex("company_sku_idx").on(
        table.companyId,
        table.sku
      ),
    };
  }
);

// Stock Adjustments table
export const stockAdjustments = pgTable("stock_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Relation definitions
export const usersRelations = relations(users, ({ many }) => ({
  employees: many(employees),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  roles: many(roles),
  locations: many(locations),
  employees: many(employees),
  shifts: many(shifts),
  shiftTemplates: many(shiftTemplates),
  items: many(items),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  company: one(companies, {
    fields: [roles.companyId],
    references: [companies.id],
  }),
  employees: many(employees),
  employeeRoles: many(employeeRoles),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  company: one(companies, {
    fields: [locations.companyId],
    references: [companies.id],
  }),
  employeeLocations: many(employeeLocations),
  shifts: many(shifts),
  items: many(items),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [employees.companyId],
    references: [companies.id],
  }),
  role: one(roles, {
    fields: [employees.roleId],
    references: [roles.id],
  }),
  shifts: many(shifts),
}));

export const employeeRolesRelations = relations(employeeRoles, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeRoles.employeeId],
    references: [employees.id],
  }),
  role: one(roles, {
    fields: [employeeRoles.roleId],
    references: [roles.id],
  }),
}));

export const employeeLocationsRelations = relations(
  employeeLocations,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeLocations.employeeId],
      references: [employees.id],
    }),
    location: one(locations, {
      fields: [employeeLocations.locationId],
      references: [locations.id],
    }),
  })
);

export const shiftsRelations = relations(shifts, ({ one }) => ({
  company: one(companies, {
    fields: [shifts.companyId],
    references: [companies.id],
  }),
  employee: one(employees, {
    fields: [shifts.employeeId],
    references: [employees.id],
  }),
  location: one(locations, {
    fields: [shifts.locationId],
    references: [locations.id],
  }),
}));

export const shiftTemplatesRelations = relations(shiftTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [shiftTemplates.companyId],
    references: [companies.id],
  }),
  role: one(roles, {
    fields: [shiftTemplates.roleId],
    references: [roles.id],
  }),
  location: one(locations, {
    fields: [shiftTemplates.locationId],
    references: [locations.id],
  }),
}));

// Add relations for items
export const itemsRelations = relations(items, ({ one, many }) => ({
  company: one(companies, {
    fields: [items.companyId],
    references: [companies.id],
  }),
  location: one(locations, {
    fields: [items.locationId],
    references: [locations.id],
  }),
  stockAdjustments: many(stockAdjustments),
}));

// Add relations for stockAdjustments
export const stockAdjustmentsRelations = relations(
  stockAdjustments,
  ({ one }) => ({
    item: one(items, {
      fields: [stockAdjustments.itemId],
      references: [items.id],
    }),
  })
);

// Later, we will add other tables like companies, employees, shifts, etc.
// as defined in the PRD.
