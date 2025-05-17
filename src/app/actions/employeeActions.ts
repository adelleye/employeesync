"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { employees, users, roles as rolesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import {
  AppError,
  NotAuthenticatedError,
  CompanyNotFoundError,
} from "@/lib/errors"; // Updated imports
import { revalidateTag } from "next/cache"; // Changed from revalidatePath

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
    const { user, activeCompany } = await getUserAndCompany(); // Destructure user
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
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

    // revalidatePath("/dashboard/settings/employees");
    revalidateTag(`company-${companyId}-employees`);
    revalidateTag(`company-${companyId}-schedule`); // Employees affect schedule

    return {
      status: "success",
      message: `Employee ${
        employeeName || userToAdd.displayName || email
      } added successfully.`,
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
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "An unexpected error occurred while adding the employee.",
    };
  }
}

export async function updateEmployeeRoleAction(
  prevState: EmployeeFormState | undefined,
  formData: FormData
): Promise<EmployeeFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany(); // Destructure user
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
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

    // revalidatePath("/dashboard/settings/employees");
    revalidateTag(`company-${companyId}-employees`);
    revalidateTag(`company-${companyId}-schedule`); // Role changes affect schedule

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
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "An unexpected error occurred while updating the employee role.",
    };
  }
}

export async function removeEmployeeAction(
  employeeId: string
): Promise<EmployeeFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany(); // Destructure user
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;

    const validatedFields = RemoveEmployeeSchema.safeParse({ employeeId });
    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid employee ID for removal.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const employeeToRemove = await db.query.employees.findFirst({
      where: and(
        eq(employees.id, validatedFields.data.employeeId),
        eq(employees.companyId, companyId)
      ),
      columns: { id: true, name: true },
      with: { user: { columns: { displayName: true, email: true } } },
    });

    if (!employeeToRemove) {
      return {
        status: "error",
        message: "Employee not found in this company.",
      };
    }

    await db
      .delete(employees)
      .where(
        and(
          eq(employees.id, validatedFields.data.employeeId),
          eq(employees.companyId, companyId)
        )
      );

    // revalidatePath("/dashboard/settings/employees");
    revalidateTag(`company-${companyId}-employees`);
    revalidateTag(`company-${companyId}-schedule`); // Employee removal affects schedule
    revalidateTag(`company-${companyId}-shifts`); // Also shifts directly

    const effectiveName =
      employeeToRemove.name ||
      employeeToRemove.user?.displayName ||
      employeeToRemove.user?.email ||
      "Employee";

    return {
      status: "success",
      message: `Employee ${effectiveName} removed successfully.`,
    };
  } catch (error) {
    console.error("removeEmployeeAction Error:", error);
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    // Specific check for foreign key constraint errors if shifts are not cascaded
    // This depends on DB schema (onDelete behavior for employees.id in shifts table)
    // If shifts.employeeId is set to RESTRICT or NO ACTION on employee deletion:
    if (
      error instanceof Error &&
      error.message.includes("violates foreign key constraint")
    ) {
      if (error.message.includes("shifts_employee_id_fkey")) {
        return {
          status: "error",
          message:
            "Cannot remove employee. They are still assigned to one or more shifts. Please reassign or delete their shifts first.",
          errors: { general: ["Employee has active shifts."] },
        };
      }
    }
    return {
      status: "error",
      message: "An unexpected error occurred while removing the employee.",
    };
  }
}
