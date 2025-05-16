"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface CompanyBasicInfo {
  id: string;
  name: string;
}

interface ActiveCompanyContextType {
  activeCompany: CompanyBasicInfo | null;
  allUserCompanies: CompanyBasicInfo[];
  setActiveCompanyOptimistic: (company: CompanyBasicInfo) => void; // For UI updates
}

const ActiveCompanyContext = createContext<
  ActiveCompanyContextType | undefined
>(undefined);

interface ActiveCompanyProviderProps {
  children: ReactNode;
  initialActiveCompany: CompanyBasicInfo | null;
  initialAllUserCompanies: CompanyBasicInfo[];
}

export const ActiveCompanyProvider = ({
  children,
  initialActiveCompany,
  initialAllUserCompanies,
}: ActiveCompanyProviderProps) => {
  // Note: The actual mechanism to change the company and persist it
  // will be via a server action. This provider primarily makes the data available.
  // The setActiveCompanyOptimistic is a placeholder if we want optimistic updates
  // before router.refresh() completes, but the primary update path is server-side.

  const [activeCompany, setActiveCompanyState] =
    React.useState<CompanyBasicInfo | null>(initialActiveCompany);
  const [allUserCompanies] = React.useState<CompanyBasicInfo[]>(
    initialAllUserCompanies
  );

  // This function is for optimistic UI updates if needed, but the source of truth update
  // happens via server action and router.refresh()
  const setActiveCompanyOptimistic = (company: CompanyBasicInfo) => {
    setActiveCompanyState(company);
  };

  return (
    <ActiveCompanyContext.Provider
      value={{
        activeCompany,
        allUserCompanies,
        setActiveCompanyOptimistic,
      }}
    >
      {children}
    </ActiveCompanyContext.Provider>
  );
};

export const useActiveCompany = () => {
  const context = useContext(ActiveCompanyContext);
  if (context === undefined) {
    throw new Error(
      "useActiveCompany must be used within an ActiveCompanyProvider"
    );
  }
  return context;
};
