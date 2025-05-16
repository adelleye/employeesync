import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { employees, locations } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AddLocationForm from "@/components/settings/AddLocationForm";
import { LocationListItem } from "@/components/settings/LocationListItem";

interface LocationData {
  id: string;
  name: string;
}

async function getLocationData() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { companyId: null, userLocations: [] };

  const employee = await db.query.employees.findFirst({
    where: eq(employees.userId, user.id),
    columns: { companyId: true },
  });

  if (!employee?.companyId) return { companyId: null, userLocations: [] };

  const companyUserLocations = await db.query.locations.findMany({
    where: eq(locations.companyId, employee.companyId),
    columns: { id: true, name: true },
    orderBy: [asc(locations.name)],
  });

  return {
    companyId: employee.companyId,
    userLocations: companyUserLocations,
  };
}

export default async function LocationsPage() {
  const { companyId, userLocations } = await getLocationData();

  if (!companyId) {
    // This case should ideally be handled by the protected layout,
    // but added as a safeguard.
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Database Error</AlertTitle>
          <AlertDescription>
            Could not load company information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Manage Locations</h1>

      <div>
        <h2 className="text-xl font-medium mb-4">Add New Location</h2>
        <AddLocationForm />
      </div>

      <div>
        <h2 className="text-xl font-medium mb-4">Existing Locations</h2>
        {userLocations.length === 0 ? (
          <p>No locations added yet.</p>
        ) : (
          <ul className="space-y-3">
            {userLocations.map((location) => (
              <LocationListItem key={location.id} location={location} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
