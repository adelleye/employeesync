import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { employees, roles } from "@/lib/db/schema"; // Import roles schema
import { eq, asc } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AddRoleForm from "@/components/settings/AddRoleForm"; // To be created
import { RoleListItem } from "@/components/settings/RoleListItem"; // To be created

// Define RoleData type for data fetching consistency
interface RoleData {
  id: string;
  name: string;
  // Add companyId if needed by RoleListItem, but likely not
}

async function getRolesPageData() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { companyId: null, companyRoles: [] };

  const employeeRecord = await db.query.employees.findFirst({
    where: eq(employees.userId, user.id),
    columns: { companyId: true },
  });

  if (!employeeRecord?.companyId) return { companyId: null, companyRoles: [] };

  const companyId = employeeRecord.companyId;
  const companyRoles = await db.query.roles.findMany({
    where: eq(roles.companyId, companyId),
    columns: { id: true, name: true }, // Select only needed fields for the list
    orderBy: [asc(roles.name)],
  });

  return { companyId, companyRoles };
}

export default async function RolesSettingsPage() {
  const { companyId, companyRoles } = await getRolesPageData();

  if (!companyId) {
    // This case should ideally be handled by the protected layout,
    // but added as a safeguard.
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>
            Could not verify company association. Please try again or contact
            support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Manage Job Roles</h1>

      <div className="p-4 border rounded-lg bg-card shadow">
        <h2 className="text-xl font-medium mb-4">Add New Role</h2>
        <AddRoleForm />
      </div>

      <div>
        <h2 className="text-xl font-medium mb-4">Existing Roles</h2>
        {companyRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No job roles added yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {companyRoles.map((role) => (
              <RoleListItem key={role.id} role={role as RoleData} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
