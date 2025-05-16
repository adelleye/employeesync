"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateCompanyPaths } from "@/lib/cache/revalidateCompanyPaths";
import { type LocationFormState } from "@/types/formStates";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { AppError } from "@/lib/errors";

// Schema for validating location name
const LocationSchema = z.object({
  name: z.string().min(1, "Location name cannot be empty"),
});

export async function createLocation(
  prevState: LocationFormState | undefined,
  formData: FormData
): Promise<LocationFormState> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = LocationSchema.safeParse({
      name: formData.get("locationName"),
    });
    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid location name.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    const { name } = validatedFields.data;
    await db.insert(locations).values({
      name: name,
      companyId: companyId,
    });
    revalidateCompanyPaths(companyId);
    return { status: "success", message: "Location created successfully." };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to create location:", error);
    return {
      status: "error",
      message: "Database error: Failed to create location.",
    };
  }
}

// Schema for validating update data
const UpdateLocationSchema = z.object({
  id: z.string().uuid("Invalid location ID"),
  name: z.string().min(1, "Location name cannot be empty"),
});

export async function updateLocation(
  prevState: LocationFormState | undefined,
  formData: FormData
): Promise<LocationFormState> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = UpdateLocationSchema.safeParse({
      id: formData.get("locationId"),
      name: formData.get("locationName"),
    });
    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid data.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    const { id, name } = validatedFields.data;
    const existingLocation = await db.query.locations.findFirst({
      where: and(eq(locations.id, id), eq(locations.companyId, companyId)),
      columns: { id: true },
    });
    if (!existingLocation) {
      return {
        status: "error",
        message: "Location not found or access denied.",
      };
    }
    await db
      .update(locations)
      .set({ name: name })
      .where(and(eq(locations.id, id), eq(locations.companyId, companyId)));
    revalidateCompanyPaths(companyId);
    return { status: "success", message: "Location updated successfully." };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to update location:", error);
    return {
      status: "error",
      message: "Database error: Failed to update location.",
    };
  }
}

// Schema for validating delete data (just the ID)
const DeleteLocationSchema = z.object({
  id: z.string().uuid("Invalid location ID"),
});

// Using FormData directly for delete simplifies client-side usage
export async function deleteLocation(
  formData: FormData
): Promise<Omit<LocationFormState, "errors">> {
  try {
    const { activeCompany } = await getUserAndCompany();
    const companyId = activeCompany.id;

    const validatedFields = DeleteLocationSchema.safeParse({
      id: formData.get("locationId"),
    });
    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid location ID.",
      };
    }
    const { id } = validatedFields.data;
    const existingLocation = await db.query.locations.findFirst({
      where: and(eq(locations.id, id), eq(locations.companyId, companyId)),
      columns: { id: true },
    });
    if (!existingLocation) {
      return {
        status: "error",
        message: "Location not found or access denied.",
      };
    }
    await db
      .delete(locations)
      .where(and(eq(locations.id, id), eq(locations.companyId, companyId)));
    revalidateCompanyPaths(companyId);
    return { status: "success", message: "Location deleted successfully." };
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to delete location:", error);
    return {
      status: "error",
      message: "Database error: Failed to delete location.",
    };
  }
}
