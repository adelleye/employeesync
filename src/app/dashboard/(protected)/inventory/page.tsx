import { db } from "@/lib/db";
import {
  items as itemsTable,
  locations as locationsTable,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { NotAuthenticatedError, CompanyNotFoundError } from "@/lib/errors";
import { redirect } from "next/navigation";
import InventoryClientPage from "@/components/inventory/InventoryClientPage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define types for data passed to client component
export type ItemForInventoryPage = typeof itemsTable.$inferSelect & {
  locationName?: string | null;
};
export type LocationForInventoryPage = typeof locationsTable.$inferSelect;

export default async function InventoryPage() {
  let activeCompanyId: string;

  try {
    const { activeCompany } = await getUserAndCompany();
    activeCompanyId = activeCompany.id;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return redirect(
        "/auth/signin?message=Authentication required for inventory."
      );
    }
    if (error instanceof CompanyNotFoundError) {
      return redirect(
        "/dashboard/create-company?message=Please create or join a company to view inventory."
      );
    }
    console.error("InventoryPage: Failed to get user and company:", error);
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Access Error</AlertTitle>
          <AlertDescription>
            There was an issue verifying your access. Please try signing in
            again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  let fetchedItems: ItemForInventoryPage[] = [];
  let fetchedLocations: LocationForInventoryPage[] = [];

  try {
    const itemsData = await db.query.items.findMany({
      where: eq(itemsTable.companyId, activeCompanyId),
      orderBy: [asc(itemsTable.name)],
      with: {
        location: {
          columns: {
            name: true,
          },
        },
      },
    });

    fetchedItems = itemsData.map((item) => ({
      ...item,
      locationName: item.location?.name ?? null,
    }));

    fetchedLocations = await db.query.locations.findMany({
      where: eq(locationsTable.companyId, activeCompanyId),
      orderBy: [asc(locationsTable.name)],
    });
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Data Fetch Error</AlertTitle>
          <AlertDescription>
            Could not load inventory data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <InventoryClientPage
      items={fetchedItems}
      locations={fetchedLocations}
      companyId={activeCompanyId}
    />
  );
}
