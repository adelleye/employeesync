"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { shiftTemplates } from "@/lib/db/schema";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { AppError } from "@/lib/errors";
import { eq, and } from "drizzle-orm";
import { revalidateCompanyPaths } from "@/lib/cache/revalidateCompanyPaths";

// Define the type for a shift template based on the Drizzle schema
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

const ShiftTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  roleId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time (HH:mm)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time (HH:mm)"),
});

export async function listShiftTemplates({
  companyId,
}: {
  companyId: string;
}): Promise<ShiftTemplate[]> {
  return db.query.shiftTemplates.findMany({
    where: eq(shiftTemplates.companyId, companyId),
  });
}

export async function createShiftTemplate(formData: FormData) {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;
    const validated = ShiftTemplateSchema.safeParse({
      name: formData.get("name"),
      roleId: formData.get("roleId") || undefined,
      locationId: formData.get("locationId") || undefined,
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
    });
    if (!validated.success) {
      return { status: "error", errors: validated.error.flatten().fieldErrors };
    }
    const { name, roleId, locationId, startTime, endTime } = validated.data;
    await db.insert(shiftTemplates).values({
      companyId,
      name,
      roleId: roleId || null,
      locationId: locationId || null,
      startTime,
      endTime,
    });
    revalidateCompanyPaths(companyId);
    return { status: "success" };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Failed to create template." };
  }
}

export async function updateShiftTemplate(formData: FormData) {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;
    const id = formData.get("id");
    if (!id || typeof id !== "string") {
      return { status: "error", message: "Missing template ID." };
    }
    const validated = ShiftTemplateSchema.safeParse({
      name: formData.get("name"),
      roleId: formData.get("roleId") || undefined,
      locationId: formData.get("locationId") || undefined,
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
    });
    if (!validated.success) {
      return { status: "error", errors: validated.error.flatten().fieldErrors };
    }
    const { name, roleId, locationId, startTime, endTime } = validated.data;
    const existing = await db.query.shiftTemplates.findFirst({
      where: and(
        eq(shiftTemplates.id, id),
        eq(shiftTemplates.companyId, companyId)
      ),
    });
    if (!existing) {
      return {
        status: "error",
        message: "Template not found or access denied.",
      };
    }
    await db
      .update(shiftTemplates)
      .set({
        name,
        roleId: roleId || null,
        locationId: locationId || null,
        startTime,
        endTime,
      })
      .where(
        and(eq(shiftTemplates.id, id), eq(shiftTemplates.companyId, companyId))
      );
    revalidateCompanyPaths(companyId);
    return { status: "success" };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Failed to update template." };
  }
}

export async function deleteShiftTemplate(id: string) {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;
    const existing = await db.query.shiftTemplates.findFirst({
      where: and(
        eq(shiftTemplates.id, id),
        eq(shiftTemplates.companyId, companyId)
      ),
    });
    if (!existing) {
      return {
        status: "error",
        message: "Template not found or access denied.",
      };
    }
    await db
      .delete(shiftTemplates)
      .where(
        and(eq(shiftTemplates.id, id), eq(shiftTemplates.companyId, companyId))
      );
    revalidateCompanyPaths(companyId);
    return { status: "success" };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Failed to delete template." };
  }
}
