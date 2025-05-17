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
  index,
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
export const locations = pgTable(
  "locations",
  {
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
  },
  (table) => {
    return {
      companyIdIndex: index("locations_company_id_idx").on(table.companyId),
      nameIndex: index("locations_name_idx").on(table.name),
    };
  }
);

// Define Roles Table BEFORE Employees because Employees references it
export const roles = pgTable(
  "roles",
  {
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
  },
  (table) => {
    return {
      companyIdIndex: index("roles_company_id_idx").on(table.companyId),
    };
  }
);

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
      companyUserUniqueIndex: uniqueIndex("employees_company_user_uidx").on(
        table.companyId,
        table.userId
      ),
      companyIdIndex: index("employees_company_id_idx").on(table.companyId),
      userIdIndex: index("employees_user_id_idx").on(table.userId),
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
      companyIdIndex: index("shifts_company_id_idx").on(table.companyId),
      startsAtIndex: index("shifts_starts_at_idx").on(table.startsAt),
      employeeIdIndex: index("shifts_employee_id_idx").on(table.employeeId),
      // Optional: Composite index for common queries filtering by company and date range
      // companyStartsAtIndex: index("shifts_company_starts_at_idx").on(table.companyId, table.startsAt),
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
  },
  (table) => {
    return {
      companySkuIndex: uniqueIndex("items_company_sku_idx").on(
        table.companyId,
        table.sku
      ),
      companyIdIndex: index("items_company_id_idx").on(table.companyId),
      nameIndex: index("items_name_idx").on(table.name),
      locationIdIndex: index("items_location_id_idx").on(table.locationId),
    };
  }
);

// Item Alerts table - To store low stock alerts
export const itemAlerts = pgTable("item_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  message: text("message"),
  triggeringQty: integer("triggering_qty").notNull(),
  reorderPointAtTrigger: integer("reorder_point_at_trigger").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
});

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
  itemAlerts: many(itemAlerts),
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
  alerts: many(itemAlerts),
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

export const itemAlertsRelations = relations(itemAlerts, ({ one }) => ({
  item: one(items, {
    fields: [itemAlerts.itemId],
    references: [items.id],
  }),
  company: one(companies, {
    fields: [itemAlerts.companyId],
    references: [companies.id],
  }),
}));

// Messaging Module Tables

// Threads Table
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    shiftId: uuid("shift_id").references(() => shifts.id, {
      onDelete: "cascade", // If a shift is deleted, its discussion thread is also deleted
    }), // Nullable, for shift-specific threads
    name: text("name").notNull(), // e.g., "#general" or "Discussion: Shift [XYZ]"
    isGeneral: boolean("is_general").default(false).notNull(), // To easily find the #general channel
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(), // To be updated on each new message
  },
  (table) => {
    return {
      companyShiftUnique: uniqueIndex("threads_company_shift_unique_idx").on(
        table.companyId,
        table.shiftId
      ), // Ensures only one thread per shift within a company
      companyGeneralUnique: uniqueIndex("threads_company_general_unique_idx")
        .on(table.companyId, table.isGeneral)
        .where(sql`${table.isGeneral} = true`), // Ensures only one #general thread per company
      companyNameIndex: index("threads_company_name_idx").on(
        table.companyId,
        table.name
      ), // For finding threads by name like #general
    };
  }
);

// Messages Table
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    userId: uuid("user_id") // Reference to Supabase auth.users.id
      .notNull(),
    companyId: uuid("company_id") // Added
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      threadTimestampIndex: index("messages_thread_created_at_idx").on(
        table.threadId,
        table.createdAt
      ),
      companyIndex: index("messages_company_id_idx").on(table.companyId), // Added
    };
  }
);

// Relations for Messaging
export const threadsRelations = relations(threads, ({ one, many }) => ({
  company: one(companies, {
    fields: [threads.companyId],
    references: [companies.id],
  }),
  shift: one(shifts, {
    fields: [threads.shiftId],
    references: [shifts.id],
  }),
  messages: many(messages),
  // Optional: relation to last message or message count for quick previews
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [messages.companyId],
    references: [companies.id],
  }),
}));

// Later, we will add other tables like companies, employees, shifts, etc.
// as defined in the PRD.
