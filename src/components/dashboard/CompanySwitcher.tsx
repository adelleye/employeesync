"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useActiveCompany } from "@/components/providers/ActiveCompanyProvider";
import { setActiveCompanyAction } from "@/app/actions/companyContextActions";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // Uncommented: Assuming sonner is used for toasts

interface CompanyBasicInfo {
  id: string;
  name: string;
}

export function CompanySwitcher() {
  const { activeCompany, allUserCompanies, setActiveCompanyOptimistic } =
    useActiveCompany();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  if (!activeCompany) {
    // This should ideally not happen if the provider is correctly initialized
    // Or could mean user has no companies, which should be handled upstream
    return null;
  }

  const handleCompanySelect = async (company: CompanyBasicInfo) => {
    if (company.id === activeCompany?.id) {
      setIsOpen(false);
      return;
    }

    // Optimistically update the UI
    setActiveCompanyOptimistic(company);
    setIsOpen(false);

    startTransition(async () => {
      try {
        const result = await setActiveCompanyAction(company.id);
        if (result.status === "error") {
          toast.error(result.message || "Failed to switch company."); // Uncommented
          console.error("Failed to switch company:", result.message);
          // Optionally revert optimistic update here if needed
          // setActiveCompanyOptimistic(activeCompany); // Revert
        }
        router.refresh(); // This will re-fetch server components and update the provider
      } catch (error) {
        console.error("Error switching company:", error);
        toast.error("An unexpected error occurred while switching companies."); // Uncommented and improved message
        // Optionally revert optimistic update
        // setActiveCompanyOptimistic(activeCompany); // Revert
      }
    });
  };

  const canCreateCompany = allUserCompanies.length < 5; // As per requirements

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-[200px] justify-between"
        >
          {activeCompany.name}
          {isPending ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px] p-0">
        <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {allUserCompanies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onSelect={() => handleCompanySelect(company)}
              className="cursor-pointer"
            >
              <Check
                className={`mr-2 h-4 w-4 ${
                  activeCompany?.id === company.id ? "opacity-100" : "opacity-0"
                }`}
              />
              {company.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild disabled={!canCreateCompany || isPending}>
          <Link
            href="/dashboard/create-company"
            className={`w-full ${
              !canCreateCompany ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={(e) => {
              if (!canCreateCompany || isPending) e.preventDefault();
              else setIsOpen(false); // Close dropdown on navigation
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Company
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
