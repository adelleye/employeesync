"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { employees as employeesTable } from "@/lib/db/schema";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import {
  AppError,
  NotAuthenticatedError,
  CompanyNotFoundError,
} from "@/lib/errors";
import { clearActiveCompanyCookieAction } from "./companyContextActions";
import { eq, and } from "drizzle-orm";
import { revalidateCompanyPaths } from "@/lib/cache/revalidateCompanyPaths";

export type RemoveEmployeeFormState = {
  message: string;
  success: boolean;
  error?: string;
};

const RemoveEmployeeSchema = z.object({
  employeeRecordId: z.string().uuid("Invalid Employee Record ID"),
  // We will get companyId from the authenticated user's active company context
});

export async function removeEmployeeFromCompanyAction(
  prevState: RemoveEmployeeFormState,
  formData: FormData
): Promise<RemoveEmployeeFormState> {
  let actorUserId: string;
  let actorActiveCompanyId: string;

  try {
    const { user: actorUser, activeCompany } = await getUserAndCompany();
    actorUserId = actorUser.id;
    actorActiveCompanyId = activeCompany.id;

    const validatedFields = RemoveEmployeeSchema.safeParse({
      employeeRecordId: formData.get("employeeRecordId"),
    });

    if (!validatedFields.success) {
      return {
        message: "Validation failed.",
        error:
          validatedFields.error
            .flatten()
            .fieldErrors.employeeRecordId?.join(", ") || "Invalid input",
        success: false,
      };
    }
    const { employeeRecordId } = validatedFields.data;

    // Fetch the employee record to be deleted to get its userId and companyId
    const employeeToRemove = await db.query.employees.findFirst({
      where: eq(employeesTable.id, employeeRecordId),
      columns: { id: true, userId: true, companyId: true },
    });

    if (!employeeToRemove) {
      return {
        message: "Employee record not found.",
        error: "Employee not found.",
        success: false,
      };
    }

    // Authorization: The actor must be operating within the context of the company from which the employee is being removed.
    // A more robust check would be role-based (e.g., only admins of employeeToRemove.companyId can do this).
    if (actorActiveCompanyId !== employeeToRemove.companyId) {
      return {
        message: "Authorization failed.",
        error: "You are not authorized to remove employees from this company.",
        success: false,
      };
    }

    // TODO: Add role-based authorization here. e.g. actorUser must be admin/owner of actorActiveCompanyId

    await db
      .delete(employeesTable)
      .where(eq(employeesTable.id, employeeRecordId));

    // If the removed employee is the actor themselves, and they were removed from their active company context
    if (
      employeeToRemove.userId === actorUserId &&
      employeeToRemove.companyId === actorActiveCompanyId
    ) {
      await clearActiveCompanyCookieAction();
    }

    revalidateCompanyPaths(employeeToRemove.companyId); // Revalidate paths for the company they were removed from.

    return { message: "Employee removed successfully.", success: true };
  } catch (error) {
    console.error("Error removing employee:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof NotAuthenticatedError) {
      errorMessage = "User not authenticated.";
    } else if (error instanceof CompanyNotFoundError) {
      errorMessage = "Active company context not found for performing user.";
    } else if (error instanceof AppError) {
      errorMessage = error.message;
    } else if (error instanceof Error && error.message) {
      errorMessage = error.message;
    }
    return {
      message: "Operation failed.",
      error: errorMessage,
      success: false,
    };
  }
}
