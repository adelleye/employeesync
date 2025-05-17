import { db } from "@/lib/db";
import { employees, users, roles as rolesTable } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import {
  NotAuthenticatedError,
  CompanyNotFoundError,
  AppError,
} from "@/lib/errors";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import EmployeesClientPage from "@/components/settings/employees/EmployeesClientPage";

export type EmployeeDataForPage = {
  id: string; // employee.id
  employeeName: string | null; // employees.name (specific name for employee record)
  userDisplayName: string | null; // users.displayName
  email: string | null; // users.email
  userId: string | null; // employees.userId (actual Supabase auth user ID)
  roleId: string | null; // employees.roleId
  roleName: string | null; // roles.name
};

export type RoleDataForForms = {
  id: string;
  name: string;
};

async function getEmployeePageData(companyId: string) {
  try {
    const companyEmployees = await db.query.employees.findMany({
      where: eq(employees.companyId, companyId),
      with: {
        user: {
          columns: {
            email: true,
            displayName: true,
          },
        },
        role: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: [asc(employees.createdAt)],
    });

    const employeeListData: EmployeeDataForPage[] = companyEmployees.map(
      (emp) => ({
        id: emp.id,
        employeeName: emp.name,
        userDisplayName: emp.user?.displayName ?? null,
        email: emp.user?.email ?? "N/A",
        userId: emp.userId,
        roleId: emp.roleId,
        roleName: emp.role?.name ?? "No role assigned",
      })
    );

    const companyRoles = await db.query.roles.findMany({
      where: eq(rolesTable.companyId, companyId),
      columns: { id: true, name: true },
      orderBy: [asc(rolesTable.name)],
    });

    return { employeeListData, companyRoles };
  } catch (error) {
    console.error("Error fetching employee page data:", error);
    // Propagate a generic error to be handled by the page component
    throw new AppError("Failed to load employee data. Please try again later.");
  }
}

export default async function EmployeesPage() {
  let activeCompanyId: string;
  let employeeListData: EmployeeDataForPage[] = [];
  let companyRolesData: RoleDataForForms[] = [];

  try {
    // Assuming getUserAndCompany() is set up to throw NotAuthenticatedError or CompanyNotFoundError
    const { activeCompany } = await getUserAndCompany();
    activeCompanyId = activeCompany.id;
    console.log(
      "[EmployeesPage] activeCompany.id from getUserAndCompany:",
      activeCompanyId
    );

    const pageData = await getEmployeePageData(activeCompanyId);
    employeeListData = pageData.employeeListData;
    companyRolesData = pageData.companyRoles;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return redirect(
        "/auth/signin?message=Authentication required for employee settings."
      );
    }
    if (error instanceof CompanyNotFoundError) {
      return redirect(
        "/dashboard/create-company?message=Please create or join a company to manage employees."
      );
    }
    // For other errors, including AppError from getEmployeePageData or other unexpected errors
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while loading employee data.";
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <EmployeesClientPage
      key={activeCompanyId}
      initialEmployees={employeeListData}
      companyRoles={companyRolesData}
      companyId={activeCompanyId}
    />
  );
}
