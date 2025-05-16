"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema"; // employees import removed as user comes from getUserAndCompany
import { eq, and } from "drizzle-orm";
import { revalidateCompanyPaths } from "@/lib/cache/revalidateCompanyPaths";
import { type RoleFormState } from "@/types/formStates";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { AppError } from "@/lib/errors";

// Schema for validating role name
const RoleSchema = z.object({
  name: z.string().min(1, "Role name cannot be empty"),
});

// Schema for validating update data
const UpdateRoleSchema = z.object({
  id: z.string().uuid("Invalid role ID"),
  name: z.string().min(1, "Role name cannot be empty"),
});

// Schema for validating delete data (just the ID)
const DeleteRoleSchema = z.object({
  id: z.string().uuid("Invalid role ID"),
});

// --- Server Actions ---

export async function createRole(
  prevState: RoleFormState | undefined,
  formData: FormData
): Promise<RoleFormState> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = RoleSchema.safeParse({
      name: formData.get("roleName"),
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid role name.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name } = validatedFields.data;

    await db.insert(roles).values({
      name: name,
      companyId: companyId,
    });

    revalidateCompanyPaths(companyId);
    return { status: "success", message: "Role created successfully." };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to create role:", error);
    return {
      status: "error",
      message: "Database error: Failed to create role.",
    };
  }
}

export async function updateRole(
  prevState: RoleFormState | undefined,
  formData: FormData
): Promise<RoleFormState> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = UpdateRoleSchema.safeParse({
      id: formData.get("roleId"),
      name: formData.get("roleName"),
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid data.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { id, name } = validatedFields.data;

    const existingRole = await db.query.roles.findFirst({
      where: and(eq(roles.id, id), eq(roles.companyId, companyId)),
      columns: { id: true },
    });

    if (!existingRole) {
      return { status: "error", message: "Role not found or access denied." };
    }

    await db
      .update(roles)
      .set({ name: name })
      .where(and(eq(roles.id, id), eq(roles.companyId, companyId)));

    revalidateCompanyPaths(companyId);
    return { status: "success", message: "Role updated successfully." };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to update role:", error);
    return {
      status: "error",
      message: "Database error: Failed to update role.",
    };
  }
}

export async function deleteRole(
  formData: FormData
): Promise<Omit<RoleFormState, "errors">> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = DeleteRoleSchema.safeParse({
      id: formData.get("roleId"),
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid role ID.",
      };
    }

    const { id } = validatedFields.data;

    const existingRole = await db.query.roles.findFirst({
      where: and(eq(roles.id, id), eq(roles.companyId, companyId)),
      columns: { id: true },
    });

    if (!existingRole) {
      return { status: "error", message: "Role not found or access denied." };
    }

    await db
      .delete(roles)
      .where(and(eq(roles.id, id), eq(roles.companyId, companyId)));

    revalidateCompanyPaths(companyId);
    return { status: "success", message: "Role deleted successfully." };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to delete role:", error);
    return {
      status: "error",
      message: "Database error: Failed to delete role.",
    };
  }
}
