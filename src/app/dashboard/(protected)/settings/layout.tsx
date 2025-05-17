import { ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="space-y-8">
      {/* <div className=\"flex items-center space-x-4 mb-8\"> */}
      {/*   <h1 className=\"text-2xl font-semibold\">Settings</h1> */}
      {/*   <Link href=\"/dashboard/settings/locations\" className=\"text-muted-foreground hover:text-primary text-sm\"> */}
      {/*     Locations */}
      {/*   </Link> */}
      {/*   <Link href=\"/dashboard/settings/roles\" className=\"text-muted-foreground hover:text-primary text-sm\"> */}
      {/*     Roles */}
      {/*   </Link> */}
      {/*   <Link href=\"/dashboard/settings/employees\" className=\"text-muted-foreground hover:text-primary text-sm\"> */}
      {/*     Employees */}
      {/*   </Link> */}
      {/* </div> */}
      {children}
    </div>
  );
}
