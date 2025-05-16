"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { employees, companies as companiesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError, NotAuthenticatedError } from "@/lib/errors";

const ACTIVE_COMPANY_COOKIE = "app-active-company-id";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

interface SetActiveCompanyResult {
  status: "success" | "error";
  message?: string;
}

export async function setActiveCompanyAction(
  companyId: string
): Promise<SetActiveCompanyResult> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new NotAuthenticatedError();
    }

    // Verify the user is part of the company they are trying to set as active
    const companyMembership = await db.query.employees.findFirst({
      where: and(
        eq(employees.userId, user.id),
        eq(employees.companyId, companyId)
      ),
      columns: { companyId: true }, // Only need to confirm existence
    });

    if (!companyMembership) {
      // Attempt to clear an invalid cookie if it was set to this companyId
      if (cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value === companyId) {
        cookieStore.set(ACTIVE_COMPANY_COOKIE, "", {
          maxAge: 0,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
      return {
        status: "error",
        message: "You are not a member of this company or it does not exist.",
      };
    }

    cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return { status: "success", message: "Active company updated." };
  } catch (error) {
    console.error("[setActiveCompanyAction] Error:", error);
    if (error instanceof NotAuthenticatedError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "An unexpected error occurred while setting the active company.",
    };
  }
}

export async function clearActiveCompanyCookieAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  console.log(
    "[clearActiveCompanyCookieAction]: Active company cookie cleared."
  );
}
