import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers"; // Import cookies
import { SignOutButton } from "@/components/auth/SignOutButton";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button"; // For potential "Go to Sign In" button
import Link from "next/link";

// Note: This page is accessible even without companyId,
// relying on the DashboardLayout and SidebarNav to guide the user.

export default async function DashboardOverviewPage() {
  // Get cookies and pass to helper
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // User is guaranteed to exist by DashboardLayout

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard!</h1>
      <p className="text-muted-foreground">
        Hello, {user?.email}! Use the sidebar to navigate.
      </p>
      {/* Add more overview content here later */}
    </div>
  );
}
