import { redirect } from "next/navigation";
import { ReactNode } from "react";
import SidebarNav from "@/components/dashboard/SidebarNav";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { ActiveCompanyProvider } from "@/components/providers/ActiveCompanyProvider";
import { NotAuthenticatedError, CompanyNotFoundError } from "@/lib/errors";
import LowStockAlertBanner from "@/components/notifications/LowStockAlertBanner";

export const revalidate = 0; // Ensure dynamic rendering for the dashboard layout and its children

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  console.time("DashboardLayout: Execution");

  try {
    const { user, activeCompany, allUserCompanies } = await getUserAndCompany();
    console.log(
      "[DashboardLayout] activeCompany.id from getUserAndCompany:",
      activeCompany.id
    );

    return (
      <ActiveCompanyProvider
        initialActiveCompany={activeCompany}
        initialAllUserCompanies={allUserCompanies}
      >
        <div className="flex h-screen bg-background">
          <SidebarNav
            userEmail={user.email ?? ""}
            employeeName={user.user_metadata?.full_name ?? user.email ?? "User"}
            companyId={activeCompany.id}
            allUserCompanies={allUserCompanies}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <LowStockAlertBanner />
      </ActiveCompanyProvider>
    );
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      redirect("/auth/signin?message=Authentication required for dashboard.");
    } else if (error instanceof CompanyNotFoundError) {
      redirect(
        "/dashboard/create-company?message=Please create or join a company."
      );
    } else {
      console.error("DashboardLayout: Unexpected error:", error);
      redirect("/auth/signin?message=An unexpected error occurred.");
    }
  } finally {
    console.timeEnd("DashboardLayout: Execution");
  }
}
