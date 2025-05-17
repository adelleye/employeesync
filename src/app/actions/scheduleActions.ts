"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { employees, shifts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import {
  AppError,
  NotAuthenticatedError,
  CompanyNotFoundError,
} from "@/lib/errors";

// Define a basic form state type (can be expanded later)
export type ShiftFormState = {
  status: "success" | "error" | "idle";
  message: string;
  errors?: {
    employeeId?: string[];
    locationId?: string[];
    startsAt?: string[];
    endsAt?: string[];
    notes?: string[];
    server?: string[]; // For general/database errors
  };
};

// Zod schema for validating shift form data
const ShiftSchema = z
  .object({
    employeeId: z.string().uuid("Invalid employee ID"),
    locationId: z.string().uuid("Invalid location ID").nullable(), // Location is optional
    // Combine date and time strings before validation
    startsAt: z.string().datetime({ message: "Invalid start date/time" }),
    endsAt: z.string().datetime({ message: "Invalid end date/time" }),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End time must be after start time",
    path: ["endsAt"], // Attach error to the endsAt field
  });

const UpdateShiftSchema = z
  .object({
    id: z.string().uuid("Invalid shift ID"),
    employeeId: z.string().uuid("Invalid employee ID"),
    locationId: z.string().uuid("Invalid location ID").nullable(),
    startsAt: z.string().datetime({ message: "Invalid start date/time" }),
    endsAt: z.string().datetime({ message: "Invalid end date/time" }),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

// --- Server Actions ---

// Ensure createShift uses await cookies()
export async function createShift(
  prevState: ShiftFormState | undefined,
  formData: FormData
): Promise<ShiftFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;

    // user will not be null here due to getUserAndCompany throwing NotAuthenticatedError
    // companyId will also be valid

    const startDateStr = formData.get("startDate") as string | null;
    const startTimeStr = formData.get("startTime") as string | null;
    const endDateStr = formData.get("endDate") as string | null;
    const endTimeStr = formData.get("endTime") as string | null;

    let startsAtISO: string | undefined;
    let endsAtISO: string | undefined;

    try {
      if (startDateStr && startTimeStr) {
        const startDateTime = new Date(`${startDateStr}T${startTimeStr}`);
        if (isNaN(startDateTime.getTime()))
          throw new Error("Invalid start date/time format");
        startsAtISO = startDateTime.toISOString();
      }
      if (endDateStr && endTimeStr) {
        const endDateTime = new Date(`${endDateStr}T${endTimeStr}`);
        if (isNaN(endDateTime.getTime()))
          throw new Error("Invalid end date/time format");
        endsAtISO = endDateTime.toISOString();
      }
    } catch (e) {
      console.error("Date parsing error:", e);
      return {
        status: "error",
        message: "Invalid shift data.",
        errors: {
          startsAt: ["Invalid date/time format."],
          endsAt: ["Invalid date/time format."],
        },
      };
    }
    // --- End Refactored Date/Time Handling ---

    // Handle the special "__NONE__" value for optional location
    const locationValue = formData.get("locationId");
    const processedLocationId =
      locationValue === "__NONE__" ? null : locationValue;

    const validatedFields = ShiftSchema.safeParse({
      employeeId: formData.get("employeeId"),
      locationId: processedLocationId,
      startsAt: startsAtISO,
      endsAt: endsAtISO,
      notes: formData.get("notes"),
    });

    if (!validatedFields.success) {
      console.log("Validation Errors:", validatedFields.error.flatten());
      return {
        status: "error",
        message: "Invalid shift data.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { employeeId, locationId, startsAt, endsAt, notes } =
      validatedFields.data;

    const employeeExists = await db.query.employees.findFirst({
      where: and(
        eq(employees.id, employeeId),
        eq(employees.companyId, companyId)
      ),
    });

    if (!employeeExists) {
      // Simplified check, as companyId is enforced by the query
      return {
        status: "error",
        message:
          "Selected employee does not belong to your company or does not exist.",
        errors: { employeeId: ["Invalid employee selection."] },
      };
    }

    await db.insert(shifts).values({
      companyId: companyId,
      employeeId: employeeId,
      locationId: locationId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      notes: notes,
    });

    revalidateTag(`company-${companyId}-schedule`);
    revalidateTag(`company-${companyId}-shifts`);
    return {
      status: "success",
      message: "Shift created successfully.",
      errors: {},
    };
  } catch (error: any) {
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to create shift:", error);
    if (
      error.code === "23P01" ||
      (error.message && error.message.includes("violates exclusion constraint"))
    ) {
      return {
        status: "error",
        message:
          "Shift conflict: This employee is already scheduled during this time.",
        errors: {
          server: [
            "Shift conflict: This employee is already scheduled during this time.",
          ],
        },
      };
    }
    return {
      status: "error",
      message: "Database error: Failed to create shift.",
    };
  }
}

export async function updateShift(
  prevState: ShiftFormState | undefined,
  formData: FormData
): Promise<ShiftFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;

    const validatedFields = UpdateShiftSchema.safeParse({
      id: formData.get("shiftId"),
      employeeId: formData.get("employeeId"),
      locationId:
        formData.get("locationId") === "__NONE__"
          ? null
          : formData.get("locationId"),
      startsAt: formData.get("startsAt"), // Assuming these are already ISO strings from client
      endsAt: formData.get("endsAt"), // Assuming these are already ISO strings from client
      notes: formData.get("notes"),
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid shift data for update.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { id, employeeId, locationId, startsAt, endsAt, notes } =
      validatedFields.data;

    // Check shift exists and belongs to company
    const existingShift = await db.query.shifts.findFirst({
      where: and(eq(shifts.id, id), eq(shifts.companyId, companyId)),
    });

    if (!existingShift) {
      return { status: "error", message: "Shift not found or access denied." };
    }

    // Check new employee belongs to company
    const employeeExists = await db.query.employees.findFirst({
      where: and(
        eq(employees.id, employeeId),
        eq(employees.companyId, companyId)
      ),
    });

    if (!employeeExists) {
      return {
        status: "error",
        message:
          "Selected employee does not belong to your company or does not exist.",
        errors: { employeeId: ["Invalid employee selection."] },
      };
    }

    await db
      .update(shifts)
      .set({
        employeeId: employeeId,
        locationId: locationId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        notes: notes,
        updatedAt: new Date(),
      })
      .where(and(eq(shifts.id, id), eq(shifts.companyId, companyId)));

    revalidateTag(`company-${companyId}-schedule`);
    revalidateTag(`company-${companyId}-shifts`);
    return {
      status: "success",
      message: "Shift updated successfully.",
      errors: {},
    };
  } catch (error: any) {
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to update shift:", error);
    if (
      error.code === "23P01" ||
      (error.message && error.message.includes("violates exclusion constraint"))
    ) {
      return {
        status: "error",
        message:
          "Shift conflict: This employee is already scheduled during this time.",
        errors: {
          server: [
            "Shift conflict: This employee is already scheduled during this time.",
          ],
        },
      };
    }
    return {
      status: "error",
      message: "Database error: Failed to update shift.",
    };
  }
}

export async function deleteShift(
  shiftId: string
): Promise<{ status: string; message: string }> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;

    if (!shiftId || typeof shiftId !== "string") {
      return { status: "error", message: "Invalid Shift ID." };
    }

    // Check shift exists and belongs to company before deleting
    const existingShift = await db.query.shifts.findFirst({
      where: and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId)),
      columns: { id: true }, // Only need to confirm existence
    });

    if (!existingShift) {
      return { status: "error", message: "Shift not found or access denied." };
    }

    await db
      .delete(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId)));

    revalidateTag(`company-${companyId}-schedule`);
    revalidateTag(`company-${companyId}-shifts`);
    return { status: "success", message: "Shift deleted successfully." };
  } catch (error: any) {
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to delete shift:", error);
    return {
      status: "error",
      message: "Database error: Failed to delete shift.",
    };
  }
}
