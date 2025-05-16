"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateLocation } from "@/app/actions/locationActions";
import { type LocationFormState } from "@/types/formStates";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initialState: LocationFormState = {
  status: "error",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending}>
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

interface EditLocationFormProps {
  locationId: string;
  currentName: string;
  onSuccess?: () => void; // Optional callback for successful update (e.g., close dialog)
}

export default function EditLocationForm({
  locationId,
  currentName,
  onSuccess,
}: EditLocationFormProps) {
  const [state, formAction] = useFormState(updateLocation, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.message) {
      if (state.status === "success") {
        toast.success(state.message);
        formRef.current?.reset(); // Reset form (or just the input field if needed)
        onSuccess?.(); // Call the success callback if provided
      } else if (state.status === "error") {
        const errorMessages = [
          ...(state.errors?.name || []),
          ...(state.errors?.id || []), // Include ID errors if any
          ...(state.errors?.server || []),
        ].join(", ");
        toast.error(state.message, {
          description: errorMessages || "Please check the form for details.",
        });
      }
    }
  }, [state, onSuccess]); // Add onSuccess to dependency array

  return (
    // Pass the specific location ID to the action via a hidden input
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="locationId" value={locationId} />
      <div>
        <Label htmlFor="locationName">Location Name</Label>
        <Input
          id="locationName"
          name="locationName"
          type="text"
          defaultValue={currentName} // Pre-fill with current name
          placeholder="Enter location name..."
          required
          className="mt-1"
          aria-describedby="locationName-error"
        />
        {state.errors?.name && (
          <div
            id="locationName-error"
            aria-live="polite"
            className="mt-1 text-xs text-red-400"
          >
            {state.errors.name.join(", ")}
          </div>
        )}
        {state.errors?.id && (
          <div
            id="locationId-error"
            aria-live="polite"
            className="mt-1 text-xs text-red-400"
          >
            {/* Display ID errors if they occur, although unlikely for user input */}
            {state.errors.id.join(", ")}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
