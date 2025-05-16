import { db } from "@/lib/db";
import {
  employees as employeesTable,
  shifts as shiftsTable,
  roles as rolesTable,
  locations as locationsTable,
} from "@/lib/db/schema";
import { eq, asc, InferSelectModel } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ShiftDisplay, { Shift } from "@/components/scheduling/ShiftDisplay";
import { listShiftTemplates } from "@/app/actions/shiftTemplateActions";
import type { ShiftTemplate } from "@/app/actions/shiftTemplateActions";
import ScheduleTabs from "./ScheduleTabs";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { NotAuthenticatedError, CompanyNotFoundError } from "@/lib/errors";
import { redirect } from "next/navigation";

// Type definitions remain largely the same
type ShiftSchemaModel = InferSelectModel<typeof shiftsTable>;
type EmployeeSchemaModel = InferSelectModel<typeof employeesTable>;
type RoleSchemaModel = InferSelectModel<typeof rolesTable>;
type LocationSchemaModel = InferSelectModel<typeof locationsTable>;

type FetchedShiftWithRelations = ShiftSchemaModel & {
  employee: Pick<EmployeeSchemaModel, "id" | "name"> | null;
  location: Pick<LocationSchemaModel, "id" | "name"> | null;
};

// Shift type for display remains the same
// type ShiftForDisplay = { ... }; // This was unused, Shift is imported from ShiftDisplay

export default async function SchedulePage() {
  console.time("SchedulePage: Total Execution");

  let activeCompanyId: string;
  let user;

  try {
    const { user: authUser, activeCompany } = await getUserAndCompany();
    user = authUser;
    activeCompanyId = activeCompany.id;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      redirect("/auth/signin?message=Authentication required for schedule.");
    }
    if (error instanceof CompanyNotFoundError) {
      redirect(
        "/dashboard/create-company?message=Please create or join a company to view schedules."
      );
    }
    // For other errors, let Next.js handle or show a generic error page
    console.error("SchedulePage: Error getting user and company:", error);
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load schedule page due to an unexpected error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fetch all schedule data using activeCompanyId
  let fetchedShiftsDetailed: FetchedShiftWithRelations[] = [];
  let fetchedEmployees: EmployeeSchemaModel[] = [];
  let fetchedRoles: RoleSchemaModel[] = [];
  let fetchedLocations: LocationSchemaModel[] = [];
  let shiftTemplatesForCompany: ShiftTemplate[] = [];

  try {
    const results = await Promise.all([
      db.query.shifts.findMany({
        where: eq(shiftsTable.companyId, activeCompanyId),
        with: {
          employee: { columns: { id: true, name: true } },
          location: { columns: { id: true, name: true } },
        },
        orderBy: [asc(shiftsTable.startsAt)],
      }) as Promise<FetchedShiftWithRelations[]>, // Keep type assertion if schema is complex
      db.query.employees.findMany({
        where: eq(employeesTable.companyId, activeCompanyId),
      }),
      db.query.roles.findMany({
        where: eq(rolesTable.companyId, activeCompanyId),
      }),
      db.query.locations.findMany({
        where: eq(locationsTable.companyId, activeCompanyId),
      }),
      listShiftTemplates({ companyId: activeCompanyId }), // Call the action
    ]);
    fetchedShiftsDetailed = results[0];
    fetchedEmployees = results[1];
    fetchedRoles = results[2];
    fetchedLocations = results[3];
    shiftTemplatesForCompany = results[4] as ShiftTemplate[];
  } catch (error) {
    console.error("SchedulePage: Data Fetch Error:", error);
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Data Fetch Error</AlertTitle>
          <AlertDescription>
            Could not load schedule data for your active company. Please try
            again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const transformedShiftsForDisplay: Shift[] = fetchedShiftsDetailed.map(
    (s) => ({
      id: s.id,
      employeeId: s.employeeId,
      locationId: s.locationId,
      startsAt: new Date(s.startsAt), // Ensure dates are Date objects
      endsAt: new Date(s.endsAt),
      // Add other fields if ShiftDisplay expects them, e.g., notes, role name/color, etc.
      // This will depend on the Shift type definition in ShiftDisplay.ts
    })
  );

  console.timeEnd("SchedulePage: Total Execution");
  return (
    <ScheduleTabs
      shifts={transformedShiftsForDisplay}
      employees={fetchedEmployees}
      roles={fetchedRoles}
      locations={fetchedLocations}
      companyId={activeCompanyId} // Pass the activeCompanyId to ScheduleTabs
      shiftTemplates={shiftTemplatesForCompany}
      // user={user} // Pass user if ScheduleTabs needs it, e.g. for permissions checks within
    />
  );
}
