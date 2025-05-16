"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateRole } from "@/app/actions/roleActions"; // Use updateRole action
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
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

interface EditRoleFormProps {
  roleId: string;
  currentName: string;
  onSuccess?: () => void;
}

export default function EditRoleForm({
  roleId,
  currentName,
  onSuccess,
}: EditRoleFormProps) {
  const [state, formAction] = useFormState(updateRole, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && state.message) {
      if (state.status === "success") {
        toast.success(state.message);
        // Optionally reset or just close dialog via onSuccess
        // formRef.current?.reset();
        onSuccess?.();
      } else if (state.status === "error") {
        const errorMessages = [
          ...(state.errors?.name || []),
          ...(state.errors?.id || []),
          ...(state.errors?.server || []),
        ].join(", ");
        toast.error(state.message, {
          description: errorMessages || "Please check the form for details.",
        });
      }
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="roleId" value={roleId} />
      <div>
        <Label htmlFor="roleName">Role Name</Label>
        <Input
          id="roleName"
          name="roleName" // Use roleName
          type="text"
          defaultValue={currentName}
          placeholder="Enter role name..."
          required
          className="mt-1"
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
        {state.errors?.id && (
          <div
            id="roleId-error"
            aria-live="polite"
            className="mt-1 text-xs text-red-400"
          >
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
