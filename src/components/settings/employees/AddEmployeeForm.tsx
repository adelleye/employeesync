"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect } from "react";
import {
  addEmployeeByEmail,
  EmployeeFormState,
} from "@/app/actions/employeeActions";
import {
  RoleDataForForms,
  EmployeeDataForPage,
} from "@/app/dashboard/(protected)/settings/employees/page";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AddEmployeeFormProps {
  // companyId: string; // Not directly used by this form, action derives it.
  roles: RoleDataForForms[];
  onSuccess: (newEmployeeData: EmployeeDataForPage) => void;
  onCloseDialog: () => void;
}

const initialState: EmployeeFormState = {
  status: "error",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Inviting..." : "Invite Employee"}
    </Button>
  );
}

export default function AddEmployeeForm({
  roles,
  onSuccess,
  onCloseDialog,
}: AddEmployeeFormProps) {
  const [formState, formAction] = useActionState(
    addEmployeeByEmail,
    initialState
  );

  useEffect(() => {
    if (formState.status === "success") {
      toast.success(formState.message);
      if (
        formState.data &&
        formState.data.id &&
        formState.data.email &&
        formState.data.userId &&
        formState.data.roleId &&
        formState.data.roleName
      ) {
        const newEmployee: EmployeeDataForPage = {
          id: formState.data.id!,
          employeeName: formState.data.employeeName ?? null,
          userDisplayName: formState.data.userDisplayName ?? null,
          email: formState.data.email!,
          userId: formState.data.userId!,
          roleId: formState.data.roleId!,
          roleName: formState.data.roleName!,
        };
        onSuccess(newEmployee);
      }
      onCloseDialog();
    } else if (formState.status === "error" && formState.message) {
      // General errors not tied to a specific field, or if you want a global toast for any error
      if (formState.errors?.general) {
        toast.error(formState.errors.general.join(", "));
      } else if (
        formState.message &&
        (!formState.errors || Object.keys(formState.errors).length === 0)
      ) {
        // Show message as toast if it's a general message without specific field errors
        toast.error(formState.message);
      } else if (
        formState.message &&
        formState.errors &&
        Object.keys(formState.errors).length > 0 &&
        !formState.errors.general
      ) {
        // If there are field errors but no general error, still show the main message if it's useful
        // Example: "Validation failed. Please check the fields below."
        // toast.info(formState.message);
        // Decided against this as field errors are more specific.
      }
    }
  }, [formState, onSuccess, onCloseDialog]);

  return (
    <form action={formAction} className="space-y-4 py-2">
      <div>
        <Label htmlFor="email-add">Employee Email</Label>
        <Input
          id="email-add"
          name="email"
          type="email"
          placeholder="user@example.com"
          required
        />
        {formState.errors?.email && (
          <p className="text-sm text-destructive mt-1">
            {formState.errors.email.join(", ")}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="employeeName-add">
          Display Name (for this company)
        </Label>
        <Input
          id="employeeName-add"
          name="employeeName"
          type="text"
          placeholder="e.g., John D. (Sales)"
        />
        {formState.errors?.employeeName && (
          <p className="text-sm text-destructive mt-1">
            {formState.errors.employeeName.join(", ")}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="roleId-add">Assign Role</Label>
        <Select name="roleId" required>
          <SelectTrigger id="roleId-add">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.length === 0 && (
              <SelectItem value="" disabled>
                No roles available. Create one first.
              </SelectItem>
            )}
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formState.errors?.roleId && (
          <p className="text-sm text-destructive mt-1">
            {formState.errors.roleId.join(", ")}
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
        <SubmitButton />
      </div>
    </form>
  );
}
