import { db } from "@/lib/db";
import {
  employees as employeesTable,
  shifts as shiftsTable,
  roles as rolesTable,
  locations as locationsTable,
} from "@/lib/db/schema";
import {
  eq,
  asc,
  and as drizzleAnd,
  gte,
  lte,
  InferSelectModel,
} from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ShiftDisplay, { Shift } from "@/components/scheduling/ShiftDisplay";
import { listShiftTemplates } from "@/app/actions/shiftTemplateActions";
import type { ShiftTemplate } from "@/app/actions/shiftTemplateActions";
import ScheduleTabs from "./ScheduleTabs";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { NotAuthenticatedError, CompanyNotFoundError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { unstable_cache as nextCache } from "next/cache";

// Type definitions remain largely the same
type ShiftSchemaModel = InferSelectModel<typeof shiftsTable>;
type EmployeeSchemaModel = InferSelectModel<typeof employeesTable>;
type RoleSchemaModel = InferSelectModel<typeof rolesTable>;
type LocationSchemaModel = InferSelectModel<typeof locationsTable>;

// Define more specific types for selected data
type SelectedEmployee = Pick<EmployeeSchemaModel, "id" | "name">;
type SelectedRole = Pick<RoleSchemaModel, "id" | "name">;
type SelectedLocation = Pick<LocationSchemaModel, "id" | "name">;

type FetchedShiftWithRelations = ShiftSchemaModel & {
  employee: Pick<EmployeeSchemaModel, "id" | "name"> | null;
  location: Pick<LocationSchemaModel, "id" | "name"> | null;
};

// Shift type for display remains the same
// type ShiftForDisplay = { ... }; // This was unused, Shift is imported from ShiftDisplay

// Helper function to get the start and end of the current week (Sunday to Saturday)
function getCurrentWeekRange(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize to start of today
  const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999); // End of Saturday

  return { startDate, endDate };
}

export default async function SchedulePage() {
  // console.time("SchedulePage: Total Execution"); // Moved for better accuracy

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

  const { startDate, endDate } = getCurrentWeekRange(); // Get current week range

  // Fetch all schedule data using activeCompanyId
  let fetchedShiftsDetailed: FetchedShiftWithRelations[] = [];
  let fetchedEmployees: SelectedEmployee[] = [];
  let fetchedRoles: SelectedRole[] = [];
  let fetchedLocations: SelectedLocation[] = [];
  let shiftTemplatesForCompany: ShiftTemplate[] = [];

  console.time("SchedulePage: Data Fetching");
  try {
    const cachedListShiftTemplates = nextCache(
      async (companyId: string) => listShiftTemplates({ companyId }),
      ["shiftTemplates", activeCompanyId],
      {
        tags: [`shiftTemplates-${activeCompanyId}`],
        revalidate: 600,
      }
    );

    const results = await Promise.all([
      db.query.shifts.findMany({
        where: drizzleAnd(
          eq(shiftsTable.companyId, activeCompanyId),
          gte(shiftsTable.startsAt, startDate), // Filter by start date
          lte(shiftsTable.startsAt, endDate) // Filter by end date (shifts starting within the week)
          // Or use lte(shiftsTable.endsAt, endDate) for shifts ending within week
          // Or a more complex range overlap check if needed
        ),
        with: {
          employee: { columns: { id: true, name: true } },
          location: { columns: { id: true, name: true } },
        },
        orderBy: [asc(shiftsTable.startsAt)],
      }) as Promise<FetchedShiftWithRelations[]>,
      db.query.employees.findMany({
        where: eq(employeesTable.companyId, activeCompanyId),
        columns: { id: true, name: true },
      }) as Promise<SelectedEmployee[]>,
      db.query.roles.findMany({
        where: eq(rolesTable.companyId, activeCompanyId),
        columns: { id: true, name: true },
      }) as Promise<SelectedRole[]>,
      db.query.locations.findMany({
        where: eq(locationsTable.companyId, activeCompanyId),
        columns: { id: true, name: true },
      }) as Promise<SelectedLocation[]>,
      cachedListShiftTemplates(activeCompanyId),
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
  console.timeEnd("SchedulePage: Data Fetching");

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

  // console.timeEnd("SchedulePage: Total Execution"); // Moved for better accuracy
  return (
    <ScheduleTabs
      key={activeCompanyId}
      shifts={transformedShiftsForDisplay}
      employees={fetchedEmployees}
      roles={fetchedRoles}
      locations={fetchedLocations}
      companyId={activeCompanyId}
      shiftTemplates={shiftTemplatesForCompany}
      // Default date range for initial load (optional, client can also manage this)
      initialStartDate={startDate.toISOString()}
      initialEndDate={endDate.toISOString()}
    />
  );
}
