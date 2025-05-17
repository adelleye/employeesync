import { db } from "@/lib/db";
import {
  items as itemsTable,
  locations as locationsTable,
} from "@/lib/db/schema";
import { eq, asc, count } from "drizzle-orm";
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

const ITEMS_PER_PAGE = 50; // Define items per page for pagination

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

  let initialItems: ItemForInventoryPage[] = [];
  let totalItemsCount = 0;
  let fetchedLocations: LocationForInventoryPage[] = [];

  try {
    // Fetch first page of items
    const itemsData = await db.query.items.findMany({
      where: eq(itemsTable.companyId, activeCompanyId),
      orderBy: [asc(itemsTable.name)],
      limit: ITEMS_PER_PAGE,
      offset: 0, // Start with the first page
      with: {
        location: {
          columns: {
            name: true,
          },
        },
      },
    });

    initialItems = itemsData.map((item) => ({
      ...item,
      locationName: item.location?.name ?? null,
    }));

    // Fetch total count of items for the company
    const totalCountResult = await db
      .select({ value: count() })
      .from(itemsTable)
      .where(eq(itemsTable.companyId, activeCompanyId));
    totalItemsCount = totalCountResult[0]?.value ?? 0;

    // Fetch all locations (assuming locations list is not excessively large)
    // If locations can also be very numerous, pagination might be needed here too.
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
      key={activeCompanyId}
      initialItems={initialItems}
      totalItems={totalItemsCount} // Pass total count
      itemsPerPage={ITEMS_PER_PAGE} // Pass items per page
      locations={fetchedLocations}
      companyId={activeCompanyId}
    />
  );
}
