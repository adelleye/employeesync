"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  Settings,
  Building,
  LogOut,
  Package,
  Users,
  CalendarCheck2,
  Warehouse,
  MessageSquare,
  PlusCircle,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming you have this utility from Shadcn
import { Button, buttonVariants } from "@/components/ui/button";
// import { signOut } from "next-auth/react"; // If using NextAuth
// For Supabase, sign out is typically an async function called from an action or client component
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // For client-side signout
import { useRouter } from "next/navigation";
import { SignOutButton } from "../auth/SignOutButton";
import { CompanySwitcher } from "./CompanySwitcher";
import { useActiveCompany } from "@/components/providers/ActiveCompanyProvider";
import { type CompanyBasicInfo } from "@/lib/auth/getUserAndCompany"; // Import CompanyBasicInfo

interface SidebarNavProps {
  companyId: string | null;
  userEmail: string;
  employeeName: string | null;
  allUserCompanies: CompanyBasicInfo[]; // Add this prop
}

export default function SidebarNav({
  companyId,
  userEmail,
  employeeName,
  allUserCompanies, // Destructure the new prop
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeCompany } = useActiveCompany();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/signin"); // Or to your landing page
    router.refresh(); // Ensure state is cleared
  };

  const currentCompanyId = activeCompany?.id ?? companyId;

  const navItems = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: Warehouse,
      active: pathname === "/dashboard",
      visible: true,
    },
    {
      href: "/dashboard/schedule",
      label: "Schedule",
      icon: CalendarCheck2,
      active: pathname.startsWith("/dashboard/schedule"),
      visible: !!currentCompanyId,
    },
    {
      href: "/dashboard/inventory",
      label: "Inventory",
      icon: Warehouse,
      active: pathname.startsWith("/dashboard/inventory"),
      visible: !!currentCompanyId,
    },
    {
      href: "/dashboard/messages",
      label: "Messages",
      icon: MessageSquare,
      active: pathname.startsWith("/dashboard/messages"),
      visible: !!currentCompanyId,
      disabled: true,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      active: pathname.startsWith("/dashboard/settings"),
      visible: true,
    },
  ];

  const settingsNavItems = [
    {
      href: "/dashboard/settings/locations",
      label: "Locations",
      icon: Building,
      active: pathname.startsWith("/dashboard/settings/locations"),
      visible: !!companyId,
    },
    {
      href: "/dashboard/settings/roles",
      label: "Job Roles",
      icon: Briefcase,
      active: pathname.startsWith("/dashboard/settings/roles"),
      visible: !!companyId,
    },
    {
      href: "/dashboard/settings/employees",
      label: "Employees",
      icon: Users,
      active: pathname.startsWith("/dashboard/settings/employees"),
      visible: !!companyId,
      disabled: true,
    },
  ];

  const isSettingsActive = pathname.startsWith("/dashboard/settings");

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-muted/40 p-4 flex flex-col">
      <div className="mb-4">
        <CompanySwitcher />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {/* Display company name here if available, or a default */}
          EmployeeSync
        </h2>
        <p className="text-sm text-muted-foreground">
          {employeeName || userEmail}
        </p>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map(
          (item) =>
            item.visible && (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    buttonVariants({
                      variant: item.active ? "secondary" : "ghost",
                    }),
                    "w-full justify-start",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  aria-disabled={item.disabled}
                  onClick={(e) => item.disabled && e.preventDefault()}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
                {item.href === "/dashboard/settings" &&
                  isSettingsActive &&
                  companyId && (
                    <div className="ml-4 mt-1 pl-2 border-l space-y-1">
                      {settingsNavItems.map(
                        (subItem) =>
                          subItem.visible && (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                buttonVariants({
                                  variant: subItem.active
                                    ? "secondary"
                                    : "ghost",
                                  size: "sm",
                                }),
                                "w-full justify-start",
                                subItem.disabled &&
                                  "opacity-50 cursor-not-allowed"
                              )}
                              aria-disabled={subItem.disabled}
                              onClick={(e) =>
                                subItem.disabled && e.preventDefault()
                              }
                            >
                              <subItem.icon className="mr-2 h-4 w-4" />
                              {subItem.label}
                            </Link>
                          )
                      )}
                    </div>
                  )}
              </div>
            )
        )}
      </nav>

      {!companyId && (
        <div className="mt-auto p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <h3 className="font-semibold text-destructive mb-2">
            Company Setup Required
          </h3>
          <p className="text-sm text-destructive/80 mb-3">
            You need to create or be added to a company to access most features.
          </p>
          <Button
            asChild
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Link href="/dashboard/create-company">Create Company</Link>
          </Button>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border">
        <SignOutButton />
      </div>
    </aside>
  );
}
