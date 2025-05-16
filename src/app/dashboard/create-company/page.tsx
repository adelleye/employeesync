import CreateCompanyForm from "@/components/auth/CreateCompanyForm";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { NotAuthenticatedError, CompanyNotFoundError } from "@/lib/errors";
import { redirect } from "next/navigation";

export default async function CreateCompanyPage() {
  try {
    await getUserAndCompany();
    // If getUserAndCompany() succeeds, user has companies and an active one is set.
    // Redirect them away from the create company page.
    redirect("/dashboard?message=You are already part of a company.");
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      redirect("/auth/signin?message=Please sign in to create a company.");
    }
    if (error instanceof CompanyNotFoundError) {
      // This is the expected path for a user needing to create a company.
      // Proceed to render the form.
    } else {
      // Unexpected error from getUserAndCompany
      console.error(
        "CreateCompanyPage: Unexpected error fetching user/company info:",
        error
      );
      // Optionally, redirect to a generic error page or display an error message here.
      // For now, we'll let it fall through to the form, but this indicates a problem.
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Create Your Company
        </h2>
        <p className="mt-2 text-center text-sm text-gray-300">
          Let&apos;s get your company set up in EmployeeSync.
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-700 py-8 px-4 shadow-xl ring-1 ring-white/10 sm:rounded-lg sm:px-10">
          <CreateCompanyForm />
        </div>
      </div>
    </div>
  );
}
