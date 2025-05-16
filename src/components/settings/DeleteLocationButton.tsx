"use client";

import { deleteLocation } from "@/app/actions/locationActions";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { toast } from "sonner"; // Import toast for potential feedback

interface DeleteLocationButtonProps {
  locationId: string;
  locationName: string; // Add name for confirmation dialog
}

export function DeleteLocationButton({
  locationId,
  locationName,
}: DeleteLocationButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleDelete = async (formData: FormData) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the location "${locationName}"?`
    );
    if (!confirmed) {
      return; // Stop if user cancels
    }

    // Call the server action
    const result = await deleteLocation(formData);

    // Optional: Show feedback based on result
    if (result.status === "success") {
      toast.success(result.message);
      // Resetting form isn't strictly necessary here unless there were visible inputs
      // formRef.current?.reset();
    } else {
      toast.error(result.message);
    }
  };

  return (
    // Pass the handleDelete wrapper function to the action prop
    <form ref={formRef} action={handleDelete}>
      <input type="hidden" name="locationId" value={locationId} />
      {/* Add hidden input for name if needed by action/confirmation, 
          but confirmation uses prop here */}
      <Button type="submit" variant="destructive" size="sm">
        Delete
      </Button>
    </form>
  );
}
