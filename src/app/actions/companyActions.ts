"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  companies as companiesTable,
  employees as employeesTable,
} from "@/lib/db/schema";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import {
  AppError,
  NotAuthenticatedError,
  CompanyNotFoundError,
} from "@/lib/errors";
import { revalidateCompanyPaths } from "@/lib/cache/revalidateCompanyPaths";
import { clearActiveCompanyCookieAction } from "./companyContextActions";
import { eq, and } from "drizzle-orm";

const CreateCompanySchema = z.object({
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name is too long"),
});

export type CreateCompanyFormState = {
  message: string;
  errors?: {
    companyName?: string[];
    server?: string[];
  };
  success: boolean;
};

export async function createCompanyAndAssociateEmployee(
  prevState: CreateCompanyFormState,
  formData: FormData
): Promise<CreateCompanyFormState> {
  try {
    const { user } = await getUserAndCompany();

    const validatedFields = CreateCompanySchema.safeParse({
      companyName: formData.get("companyName"),
    });

    if (!validatedFields.success) {
      return {
        message: "Validation failed.",
        errors: validatedFields.error.flatten().fieldErrors,
        success: false,
      };
    }

    const { companyName } = validatedFields.data;

    const newCompany = await db.transaction(async (tx) => {
      const [createdCompany] = await tx
        .insert(companiesTable)
        .values({
          name: companyName,
        })
        .returning({ id: companiesTable.id, name: companiesTable.name });

      if (!createdCompany || !createdCompany.id) {
        throw new Error("Failed to create company record.");
      }

      await tx.insert(employeesTable).values({
        companyId: createdCompany.id,
        userId: user.id,
        name: user.user_metadata?.full_name ?? user.email,
      });

      return createdCompany;
    });

    revalidateCompanyPaths(newCompany.id);

    return {
      message: "Company created successfully!",
      success: true,
    };
  } catch (error) {
    console.error("Error creating company and employee:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof NotAuthenticatedError) {
      errorMessage = "User not authenticated. Please sign in again.";
    } else if (error instanceof AppError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      message: "Database operation failed.",
      errors: { server: [errorMessage] },
      success: false,
    };
  }
}

export type DeleteCompanyFormState = {
  message: string;
  success: boolean;
  error?: string;
};

const DeleteCompanySchema = z.object({
  companyIdToDelete: z.string().uuid("Invalid Company ID"),
});

export async function deleteCompanyAction(
  prevState: DeleteCompanyFormState,
  formData: FormData
): Promise<DeleteCompanyFormState> {
  let performingUserActiveCompanyId: string | null = null;

  try {
    const { user, activeCompany } = await getUserAndCompany();
    performingUserActiveCompanyId = activeCompany.id;

    const validatedFields = DeleteCompanySchema.safeParse({
      companyIdToDelete: formData.get("companyIdToDelete"),
    });

    if (!validatedFields.success) {
      return {
        message: "Validation failed.",
        error:
          validatedFields.error
            .flatten()
            .fieldErrors.companyIdToDelete?.join(", ") || "Invalid input",
        success: false,
      };
    }
    const { companyIdToDelete } = validatedFields.data;

    const membership = await db.query.employees.findFirst({
      where: and(
        eq(employeesTable.userId, user.id),
        eq(employeesTable.companyId, companyIdToDelete)
      ),
      columns: { id: true },
    });

    if (!membership) {
      return {
        message: "Authorization failed.",
        error:
          "You are not authorized to delete this company or it does not exist.",
        success: false,
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(employeesTable)
        .where(eq(employeesTable.companyId, companyIdToDelete));

      const deleteResult = await tx
        .delete(companiesTable)
        .where(eq(companiesTable.id, companyIdToDelete))
        .returning({ id: companiesTable.id });
      if (deleteResult.length === 0) {
        throw new AppError(
          "Failed to delete company. It might have been already deleted."
        );
      }
    });

    if (performingUserActiveCompanyId === companyIdToDelete) {
      await clearActiveCompanyCookieAction();
    }

    revalidateCompanyPaths(companyIdToDelete);

    return { message: "Company deleted successfully.", success: true };
  } catch (error) {
    console.error("Error deleting company:", error);
    let errorMessage = "An unexpected error occurred during company deletion.";
    if (error instanceof NotAuthenticatedError) {
      errorMessage = "User not authenticated.";
    } else if (error instanceof CompanyNotFoundError) {
      errorMessage = "Active company context not found.";
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
