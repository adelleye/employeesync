"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { updateItem, InventoryFormState } from "@/app/actions/inventoryActions";
import {
  ItemForInventoryPage,
  LocationForInventoryPage,
} from "@/app/dashboard/(protected)/inventory/page";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditItemFormProps {
  item: ItemForInventoryPage;
  locations: LocationForInventoryPage[];
  onSuccess: (updatedItem: ItemForInventoryPage) => void;
  onCancel: () => void;
}

const initialState: InventoryFormState = {
  status: "idle",
  message: "",
  errors: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Saving Changes..." : "Save Changes"}
    </Button>
  );
}

export default function EditItemForm({
  item,
  locations,
  onSuccess,
  onCancel,
}: EditItemFormProps) {
  // The server action expects `prevState` first, then `formData`.
  // `useActionState` will pass the current state as the first argument to the action.
  const [state, formAction] = useActionState(updateItem, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      if (state.data) {
        onSuccess(state.data as ItemForInventoryPage); // Ensure data is cast to correct type
      }
    } else if (state.status === "error") {
      toast.error(state.message);
      if (state.errors) {
        Object.entries(state.errors).forEach(([field, errors]) => {
          errors?.forEach((errorMsg) => toast.error(`${field}: ${errorMsg}`));
        });
      }
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={item.id} />
      {/* We don't need companyId in the form as getUserAndCompany handles it */}

      <div>
        <Label htmlFor="edit-name">Item Name</Label>
        <Input id="edit-name" name="name" defaultValue={item.name} required />
        {state.errors?.name && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.name.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="edit-sku">SKU (Optional)</Label>
        <Input id="edit-sku" name="sku" defaultValue={item.sku ?? ""} />
        {state.errors?.sku && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.sku.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="edit-reorderPoint">Reorder Point (Optional)</Label>
        <Input
          id="edit-reorderPoint"
          name="reorderPoint"
          type="number"
          defaultValue={item.reorderPoint ?? ""}
        />
        {state.errors?.reorderPoint && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.reorderPoint.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="edit-locationId">Location (Optional)</Label>
        <Select name="locationId" defaultValue={item.locationId ?? undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Select a location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.locationId && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.locationId.join(", ")}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
