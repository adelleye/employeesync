"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createLocation } from "@/app/actions/locationActions";
import { type LocationFormState } from "@/types/formStates";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner"; // Correct: Import toast from sonner

const initialState: LocationFormState = {
  status: "error", // Default to error or an undefined initial state if preferred
  message: "",
  // Initialize errors if needed, though actions return it
  // errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending}>
      {pending ? "Adding..." : "Add Location"}
    </Button>
  );
}

// Remove companyId prop if action fetches it securely
// interface AddLocationFormProps {
//   companyId: string;
// }

export default function AddLocationForm() {
  const [state, formAction] = useActionState(createLocation, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // No need for useToast hook anymore
  // const { toast } = useToast();

  useEffect(() => {
    // Check if state is not the initial state by checking message
    if (state && state.message) {
      if (state.status === "success") {
        // Use state.status
        toast.success(state.message);
        formRef.current?.reset();
      } else if (state.status === "error") {
        // Use state.status
        // Combine specific field errors (name) and general server errors
        const errorMessages = [
          ...(state.errors?.name || []), // Use state.errors.name
          ...(state.errors?.server || []),
        ].join(", ");
        toast.error(state.message, {
          description: errorMessages || "Please check the form for details.",
        });
      }
      // Removed the general `else if (!state.success && state.message)`
      // as status covers success/error explicitly.
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-4">
      <div className="flex-grow">
        <Label htmlFor="locationName" className="sr-only">
          Location Name
        </Label>
        <Input
          id="locationName"
          name="locationName"
          type="text"
          placeholder="Enter new location name..."
          required
          className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-white"
          aria-describedby="locationName-error"
        />
        {/* Display field-specific errors (use state.errors.name) */}
        {state.errors?.name && (
          <div
            id="locationName-error"
            aria-live="polite"
            className="mt-1 text-xs text-red-400"
          >
            {state.errors.name.join(", ")}
          </div>
        )}
      </div>
      {/* Removed hidden companyId input as action fetches it securely */}
      {/* <input type="hidden" name="companyId" value={companyId} /> */}
      <SubmitButton />
    </form>
  );
}
