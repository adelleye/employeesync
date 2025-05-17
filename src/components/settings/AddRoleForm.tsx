"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createRole } from "@/app/actions/roleActions"; // Use createRole action
import { type RoleFormState } from "@/types/formStates"; // Use RoleFormState
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initialState: RoleFormState = {
  status: "error",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending}>
      {pending ? "Adding..." : "Add Role"}
    </Button>
  );
}

export default function AddRoleForm() {
  const [state, formAction] = useActionState(createRole, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.message) {
      if (state.status === "success") {
        toast.success(state.message);
        formRef.current?.reset();
      } else if (state.status === "error") {
        const errorMessages = [
          ...(state.errors?.name || []),
          ...(state.errors?.server || []),
        ].join(", ");
        toast.error(state.message, {
          description: errorMessages || "Please check the form for details.",
        });
      }
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-4">
      <div className="flex-grow">
        <Label htmlFor="roleName" className="sr-only">
          Role Name
        </Label>
        <Input
          id="roleName"
          name="roleName" // Use roleName
          type="text"
          placeholder="Enter new role name..."
          required
          className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white"
          aria-describedby="roleName-error"
        />
        {state.errors?.name && (
          <div
            id="roleName-error"
            aria-live="polite"
            className="mt-1 text-xs text-red-400"
          >
            {state.errors.name.join(", ")}
          </div>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
