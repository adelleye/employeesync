import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
// No longer using ReadonlyRequestCookies for assertion here as await changes the flow
import {
  NotAuthenticatedError,
  CompanyNotFoundError,
  // MultipleCompaniesError, // This error will likely not be thrown anymore from here
} from "@/lib/errors";
import { employees, companies as companiesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const ACTIVE_COMPANY_COOKIE = "app-active-company-id";
// COOKIE_MAX_AGE is not used here anymore

export interface CompanyBasicInfo {
  id: string;
  name: string;
}

interface GetUserAndCompanyReturn {
  user: any; // Supabase user type
  activeCompany: CompanyBasicInfo;
  allUserCompanies: CompanyBasicInfo[];
}

/**
 * Returns the authenticated Supabase user, their active company, and all companies they belong to.
 * - Reads active company from a cookie.
 * - If no valid cookie, auto-selects the first company and sets the cookie.
 * - Throws NotAuthenticatedError or CompanyNotFoundError.
 */
export async function getUserAndCompany(): Promise<GetUserAndCompanyReturn> {
  const cookieStore = await cookies(); // Changed to await cookies()
  const supabase = createSupabaseServerClient(cookieStore); // Pass the resolved cookieStore

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new NotAuthenticatedError();
  }

  const userEmployeeRecords = await db.query.employees.findMany({
    where: eq(employees.userId, user.id),
    with: {
      company: {
        columns: { id: true, name: true },
      },
    },
  });

  const allUserCompanies: CompanyBasicInfo[] = userEmployeeRecords
    .map((e) => e.company)
    .filter((c): c is CompanyBasicInfo => !!c);

  if (allUserCompanies.length === 0) {
    throw new CompanyNotFoundError("User is not associated with any company.");
  }

  let activeCompany: CompanyBasicInfo | undefined;
  const requestedCompanyIdFromCookie = cookieStore.get(
    ACTIVE_COMPANY_COOKIE
  )?.value;
  // Removed: let mustSetCookie = false;

  if (requestedCompanyIdFromCookie) {
    activeCompany = allUserCompanies.find(
      (c) => c.id === requestedCompanyIdFromCookie
    );
    if (!activeCompany) {
      console.warn(
        `User ${user.id} had active company cookie for ${requestedCompanyIdFromCookie} but is no longer a member or company doesn\'t exist. Selecting first available.`
      );
      activeCompany = allUserCompanies[0];
      // Placeholder for analytics: inform that a cookie was invalid and a default was used for this request
      console.log(
        `ANALYTICS_EVENT: InvalidActiveCompanyCookie_DefaultSelected for user ${user.id}`
      );
    }
  } else {
    activeCompany = allUserCompanies[0];
    // Placeholder for analytics: inform that a default company was auto-selected for this request
    console.log(
      `ANALYTICS_EVENT: DefaultCompanyAutoSelected_ForRequest for user ${user.id}`
    );
  }

  // REMOVED COOKIE SETTING LOGIC:
  // Server Components (where this is called from) cannot set cookies.
  // Cookie setting is now solely the responsibility of setActiveCompanyAction (Server Action).

  if (!activeCompany) {
    // This case should be rare given the logic above, but as a fallback:
    console.error(
      "[getUserAndCompany] Critical error: Active company could not be determined despite user having companies. Defaulting to first."
    );
    activeCompany = allUserCompanies[0]; // Should always have at least one due to earlier check
  }

  return {
    user,
    activeCompany: activeCompany, // activeCompany is now guaranteed to be set
    allUserCompanies,
  };
}
