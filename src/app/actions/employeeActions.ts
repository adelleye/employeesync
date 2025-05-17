"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { employees, users, roles as rolesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { AppError } from "@/lib/errors"; // Assuming NotAuthenticatedError, CompanyNotFoundError are thrown by getUserAndCompany
import { revalidatePath } from "next/cache";

// State Definition
export type EmployeeFormState = {
  status: "success" | "error";
  message: string;
  errors?: {
    email?: string[];
    roleId?: string[];
    employeeName?: string[]; // For employee-specific name
    general?: string[];
    [key: string]: string[] | undefined;
  };
  data?: {
    // For returning newly created/updated employee partial data
    id?: string;
    userId?: string | null;
    email?: string | null;
    roleId?: string | null;
    roleName?: string | null;
    employeeName?: string | null;
    userDisplayName?: string | null;
  };
};

// Schemas for validation
const AddEmployeeSchema = z.object({
  email: z
    .string()
    .email("Invalid email address.")
    .min(1, "Email is required."),
  roleId: z.string().uuid("Role selection is required."),
  employeeName: z
    .string()
    .min(1, "Display name for employee is required.")
    .max(255)
    .optional()
    .nullable(),
});

const UpdateEmployeeRoleSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID."),
  newRoleId: z.string().uuid("Role selection is required."),
});

const RemoveEmployeeSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID."),
});

// Server Actions

export async function addEmployeeByEmail(
  prevState: EmployeeFormState | undefined,
  formData: FormData
): Promise<EmployeeFormState> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = AddEmployeeSchema.safeParse({
      email: formData.get("email"),
      roleId: formData.get("roleId"),
      employeeName: formData.get("employeeName") || null,
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid data provided.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    const { email, roleId, employeeName } = validatedFields.data;

    const userToAdd = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, displayName: true },
    });

    if (!userToAdd) {
      return {
        status: "error",
        message: `User with email ${email} not found. They must have an account on this platform first.`,
        errors: { email: ["User not found."] },
      };
    }
    const userId = userToAdd.id;

    const existingEmployee = await db.query.employees.findFirst({
      where: and(
        eq(employees.companyId, companyId),
        eq(employees.userId, userId)
      ),
    });

    if (existingEmployee) {
      return {
        status: "error",
        message: `User ${email} is already an employee in this company.`,
        errors: { email: ["User already an employee here."] },
      };
    }

    const roleExists = await db.query.roles.findFirst({
      where: and(
        eq(rolesTable.id, roleId),
        eq(rolesTable.companyId, companyId)
      ),
      columns: { id: true, name: true },
    });
    if (!roleExists) {
      return {
        status: "error",
        message: "Invalid role selected.",
        errors: { roleId: ["Role does not exist or belong to this company."] },
      };
    }

    const [newEmployeeEntry] = await db
      .insert(employees)
      .values({
        companyId,
        userId,
        roleId,
        name: employeeName,
      })
      .returning({
        id: employees.id,
        name: employees.name,
        roleId: employees.roleId,
        userId: employees.userId,
      });

    revalidatePath("/dashboard/settings/employees");
    return {
      status: "success",
      message: `Employee ${
        employeeName || userToAdd.displayName || email
      } added successfully.`, // Use employeeName if provided
      data: {
        id: newEmployeeEntry.id,
        userId: newEmployeeEntry.userId ?? null,
        email: userToAdd.email ?? null,
        roleId: newEmployeeEntry.roleId ?? null,
        roleName: roleExists.name,
        employeeName: newEmployeeEntry.name ?? null,
        userDisplayName: userToAdd.displayName ?? null,
      },
    };
  } catch (error) {
    console.error("addEmployeeByEmail Error:", error);
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "An unexpected error occurred while adding the employee.",
    };
  }
}

export async function updateEmployeeRoleAction(
  prevState: EmployeeFormState | undefined, // Keep prevState for consistency with useFormState
  formData: FormData
): Promise<EmployeeFormState> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    // Ensure employeeId and newRoleId are strings from FormData
    const employeeId = formData.get("employeeId") as string;
    const newRoleId = formData.get("newRoleId") as string;

    const validatedFields = UpdateEmployeeRoleSchema.safeParse({
      employeeId,
      newRoleId,
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid data.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const employeeToUpdate = await db.query.employees.findFirst({
      where: and(
        eq(employees.id, validatedFields.data.employeeId),
        eq(employees.companyId, companyId)
      ),
      columns: { id: true, name: true }, // Fetch name for success message
      with: { user: { columns: { displayName: true, email: true } } }, // Fetch user display name for success message
    });

    if (!employeeToUpdate) {
      return {
        status: "error",
        message: "Employee not found in this company.",
      };
    }

    const roleExists = await db.query.roles.findFirst({
      where: and(
        eq(rolesTable.id, validatedFields.data.newRoleId),
        eq(rolesTable.companyId, companyId)
      ),
      columns: { id: true, name: true }, // Fetch role name for success message
    });
    if (!roleExists) {
      return {
        status: "error",
        message: "Invalid role selected.",
        errors: { roleId: ["Role does not exist or belong to this company."] },
      };
    }

    const [updatedEmployee] = await db
      .update(employees)
      .set({ roleId: validatedFields.data.newRoleId, updatedAt: new Date() })
      .where(
        and(
          eq(employees.id, validatedFields.data.employeeId),
          eq(employees.companyId, companyId)
        )
      )
      .returning({
        id: employees.id,
        name: employees.name,
        roleId: employees.roleId,
        userId: employees.userId,
      });

    revalidatePath("/dashboard/settings/employees");
    const effectiveName =
      updatedEmployee.name ||
      employeeToUpdate.user?.displayName ||
      employeeToUpdate.user?.email ||
      "Employee";
    return {
      status: "success",
      message: `Role updated to ${roleExists.name} for ${effectiveName}.`,
      data: {
        id: updatedEmployee.id,
        userId: updatedEmployee.userId ?? null,
        email: employeeToUpdate.user?.email ?? null,
        roleId: updatedEmployee.roleId ?? null,
        roleName: roleExists.name,
        employeeName: updatedEmployee.name ?? null,
        userDisplayName: employeeToUpdate.user?.displayName ?? null,
      },
    };
  } catch (error) {
    console.error("updateEmployeeRoleAction Error:", error);
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Failed to update employee role." };
  }
}

export async function removeEmployeeAction(
  employeeId: string
): Promise<EmployeeFormState> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = RemoveEmployeeSchema.safeParse({ employeeId });
    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid employee ID provided.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const employeeToDelete = await db.query.employees.findFirst({
      where: and(
        eq(employees.id, validatedFields.data.employeeId),
        eq(employees.companyId, companyId)
      ),
      columns: { id: true, name: true },
      with: { user: { columns: { email: true, displayName: true } } },
    });

    if (!employeeToDelete) {
      return {
        status: "error",
        message: "Employee not found in this company.",
      };
    }

    // CRITICAL NOTE: The current schema (employees.shifts relation) likely has onDelete: "cascade" for shifts.
    // This means deleting an employee will also delete all their associated shifts.
    // This is a destructive operation and might not be desired.
    // Ideally, shifts.employee_id should be SET NULL or an admin should reassign them before deletion.
    // Proceeding with delete as per current schema understanding for this action's scope.
    await db
      .delete(employees)
      .where(
        and(
          eq(employees.id, validatedFields.data.employeeId),
          eq(employees.companyId, companyId)
        )
      );

    revalidatePath("/dashboard/settings/employees");
    const effectiveName =
      employeeToDelete.name ||
      employeeToDelete.user?.displayName ||
      employeeToDelete.user?.email ||
      "Employee ID: " + employeeToDelete.id;
    return {
      status: "success",
      message: `Employee ${effectiveName} has been removed.`,
    };
  } catch (error) {
    console.error("removeEmployeeAction Error:", error);
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    // Consider checking for db error codes if FK constraints prevent deletion due to related data not set to cascade/null.
    return {
      status: "error",
      message:
        "Failed to remove employee. They might have dependent data (e.g., shifts) that needs to be handled.",
    };
  }
}
