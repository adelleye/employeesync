"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { createItem, InventoryFormState } from "@/app/actions/inventoryActions";
import { LocationForInventoryPage } from "@/app/dashboard/(protected)/inventory/page";

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
import { Textarea } from "@/components/ui/textarea"; // If notes or description were needed

interface AddItemFormProps {
  companyId: string;
  locations: LocationForInventoryPage[];
  onSuccess: (newItem: any) => void; // Consider using a more specific type for newItem
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
      {pending ? "Adding Item..." : "Add Item"}
    </Button>
  );
}

export default function AddItemForm({
  companyId,
  locations,
  onSuccess,
  onCancel,
}: AddItemFormProps) {
  const [state, formAction] = useActionState(createItem, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      if (state.data) {
        onSuccess(state.data);
      }
    } else if (state.status === "error") {
      toast.error(state.message);
      // Optionally display field errors more granularly if needed
      if (state.errors) {
        Object.entries(state.errors).forEach(([field, errors]) => {
          errors?.forEach((errorMsg) => toast.error(`${field}: ${errorMsg}`));
        });
      }
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />

      <div>
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" name="name" required />
        {state.errors?.name && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.name.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="sku">SKU (Optional)</Label>
        <Input id="sku" name="sku" />
        {state.errors?.sku && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.sku.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="reorderPoint">Reorder Point (Optional)</Label>
        <Input id="reorderPoint" name="reorderPoint" type="number" />
        {state.errors?.reorderPoint && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.reorderPoint.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="locationId">Location (Optional)</Label>
        <Select name="locationId">
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
