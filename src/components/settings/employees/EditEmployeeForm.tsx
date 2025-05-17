"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import {
  updateEmployeeRoleAction,
  EmployeeFormState,
} from "@/app/actions/employeeActions";
import {
  RoleDataForForms,
  EmployeeDataForPage,
} from "@/app/dashboard/(protected)/settings/employees/page";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input"; // Not needed if using hidden input directly
import { toast } from "sonner";

interface EditEmployeeFormProps {
  employee: EmployeeDataForPage;
  roles: RoleDataForForms[];
  onSuccess: (updatedEmployeeData: EmployeeDataForPage) => void;
  onCloseDialog: () => void;
}

const initialEditState: EmployeeFormState = {
  status: "error",
  message: "",
};

function EditSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving Changes..." : "Save Changes"}
    </Button>
  );
}

export default function EditEmployeeForm({
  employee,
  roles,
  onSuccess,
  onCloseDialog,
}: EditEmployeeFormProps) {
  // roleId from employee prop can be null if no role is assigned. Select expects string or undefined for defaultValue.
  const [currentRoleId, setCurrentRoleId] = useState<string | undefined>(
    employee.roleId ?? undefined // Use undefined if employee.roleId is null/undefined
  );
  const [formState, formAction] = useActionState(
    updateEmployeeRoleAction,
    initialEditState
  );

  useEffect(() => {
    if (formState.status === "success") {
      toast.success(formState.message);
      if (
        formState.data &&
        formState.data.id &&
        formState.data.roleId &&
        formState.data.roleName
      ) {
        const updatedEmployeeData: EmployeeDataForPage = {
          ...employee, // Start with existing data
          id: formState.data.id!, // id should not change, but action returns it
          roleId: formState.data.roleId!,
          roleName: formState.data.roleName!,
          // Update other fields if the action returns them and they are part of EmployeeDataForPage
          employeeName:
            formState.data.employeeName !== undefined
              ? formState.data.employeeName
              : employee.employeeName,
          userDisplayName:
            formState.data.userDisplayName !== undefined
              ? formState.data.userDisplayName
              : employee.userDisplayName,
          email:
            formState.data.email !== undefined
              ? formState.data.email
              : employee.email,
          userId:
            formState.data.userId !== undefined
              ? formState.data.userId
              : employee.userId,
        };
        onSuccess(updatedEmployeeData);
      }
      onCloseDialog();
    } else if (formState.status === "error" && formState.message) {
      if (formState.errors?.general) {
        toast.error(formState.errors.general.join(", "));
      } else if (
        formState.message &&
        (!formState.errors || Object.keys(formState.errors).length === 0)
      ) {
        toast.error(formState.message);
      }
    }
  }, [formState, onSuccess, onCloseDialog, employee]);

  return (
    <form action={formAction} className="space-y-4 py-2">
      <input type="hidden" name="employeeId" value={employee.id} />

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Editing role for:{" "}
          <span className="font-semibold text-foreground">
            {employee.employeeName ||
              employee.userDisplayName ||
              employee.email}
          </span>
        </p>
      </div>

      <div>
        <Label htmlFor="newRoleId-edit">Assign New Role</Label>
        <Select
          name="newRoleId"
          defaultValue={currentRoleId}
          onValueChange={setCurrentRoleId}
          required
        >
          <SelectTrigger id="newRoleId-edit">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No roles available. Please create one first in Settings &gt; Job
                Roles.
              </p>
            ) : (
              roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {/* The Zod schema for UpdateEmployeeRoleSchema uses newRoleId. Errors from it will be under errors.newRoleId */}
        {formState.errors?.newRoleId && (
          <p className="text-sm text-destructive mt-1">
            {formState.errors.newRoleId.join(", ")}
          </p>
        )}
      </div>

      {formState.status === "error" &&
        formState.message &&
        formState.errors?.general && (
          <p className="text-sm text-destructive pt-2 text-center">
            {formState.errors.general.join(", ")}
          </p>
        )}

      <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 pt-2 space-y-2 sm:space-y-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCloseDialog}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <EditSubmitButton />
      </div>
    </form>
  );
}
