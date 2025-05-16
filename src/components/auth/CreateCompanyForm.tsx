"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createCompanyAndAssociateEmployee,
  CreateCompanyFormState,
} from "@/app/actions/companyActions";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateCompanyFormState = {
  message: "",
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className="w-full"
    >
      {pending ? "Creating Company..." : "Create Company"}
    </Button>
  );
}

export default function CreateCompanyForm() {
  const [state, formAction] = useFormState(
    createCompanyAndAssociateEmployee,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success && state.message === "Company created successfully!") {
      router.push("/dashboard/schedule");
    }
  }, [state.success, state.message, router]);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label
          htmlFor="companyName"
          className="block text-sm font-medium text-gray-200"
        >
          Company Name
        </Label>
        <div className="mt-1">
          <Input
            id="companyName"
            name="companyName"
            type="text"
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white"
            aria-describedby="companyName-error"
          />
        </div>
        {state.errors?.companyName && (
          <div
            id="companyName-error"
            aria-live="polite"
            className="mt-2 text-sm text-red-400"
          >
            {state.errors.companyName.map((error: string) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
      </div>

      {state.errors?.server && (
        <div aria-live="polite" className="mt-2 text-sm text-red-400">
          {state.errors.server.map((error: string) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
      {state.message && !state.success && !state.errors?.server && (
        // General message if not a server error and not success (e.g. initial state or client validation before server)
        <div aria-live="polite" className="mt-2 text-sm text-yellow-400">
          <p>{state.message}</p>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
