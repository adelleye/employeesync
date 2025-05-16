import { revalidatePath } from "next/cache";

/**
 * Revalidates all dashboard and settings paths that depend on the given companyId.
 * Extend this list as new company-specific pages are added.
 */
export function revalidateCompanyPaths(companyId: string) {
  // Main dashboard
  revalidatePath("/dashboard");
  // Schedule
  revalidatePath("/dashboard/schedule");
  // Settings pages
  revalidatePath("/dashboard/settings/locations");
  revalidatePath("/dashboard/settings/roles");
  // Add more as needed (e.g., inventory, messaging, etc.)
}
