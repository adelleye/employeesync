import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { employees as employeesTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default async function ProtectedDashboardLayout({
  children,
}: ProtectedLayoutProps) {
  // The parent DashboardLayout already handles initial auth & basic company ID check for sidebar.
  // Specific pages/components within this layout will handle their own data needs
  // and can perform more specific checks if required.
  // Removing the redundant check here to improve performance.

  /* Removed redundant checks:
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin?message=Authentication required.");
  }

  try {
    const employeeRecord = await db.query.employees.findFirst({
      where: eq(employeesTable.userId, user.id),
      columns: { companyId: true },
    });

    if (!employeeRecord?.companyId) {
      redirect("/dashboard/create-company");
    }
  } catch (dbError) {
    console.error(
      "ProtectedDashboardLayout: DB error fetching company ID for enforcement:",
      dbError
    );
    redirect(
      "/dashboard/create-company?error=protected_layout_db_check_failed"
    );
  }
  */

  return <>{children}</>;
}
