"use client";

import { deleteRole } from "@/app/actions/roleActions"; // Use deleteRole action
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { toast } from "sonner";

interface DeleteRoleButtonProps {
  roleId: string;
  roleName: string;
}

export function DeleteRoleButton({ roleId, roleName }: DeleteRoleButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleDelete = async (formData: FormData) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the role "${roleName}"? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    const result = await deleteRole(formData);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      // Provide more context for FK error
      const description = result.message.includes(
        "assigned to employees or shifts"
      )
        ? "Ensure no employees or shifts are assigned this role before deleting."
        : "Failed to delete role.";
      toast.error(result.message, { description });
    }
  };

  return (
    <form ref={formRef} action={handleDelete}>
      <input type="hidden" name="roleId" value={roleId} />
      <Button type="submit" variant="destructive" size="sm">
        Delete
      </Button>
    </form>
  );
}
