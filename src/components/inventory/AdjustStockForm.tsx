"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  adjustStock,
  InventoryFormState,
} from "@/app/actions/inventoryActions";
import { ItemForInventoryPage } from "@/app/dashboard/(protected)/inventory/page";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdjustStockFormProps {
  item: ItemForInventoryPage;
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
      {pending ? "Adjusting Stock..." : "Adjust Stock"}
    </Button>
  );
}

export default function AdjustStockForm({
  item,
  onSuccess,
  onCancel,
}: AdjustStockFormProps) {
  const [state, formAction] = useActionState(adjustStock, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      if (state.data) {
        onSuccess(state.data as ItemForInventoryPage);
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
      <input type="hidden" name="itemId" value={item.id} />

      <p className="text-sm">
        Adjusting stock for: <strong>{item.name}</strong> (Current Qty:{" "}
        {item.qtyOnHand})
      </p>

      <div>
        <Label htmlFor={`adjust-delta-${item.id}`}>
          Adjustment Amount (+/-)
        </Label>
        <Input
          id={`adjust-delta-${item.id}`}
          name="delta"
          type="number"
          placeholder="e.g., -5 or 10"
          required
        />
        {state.errors?.delta && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.delta.join(", ")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor={`adjust-reason-${item.id}`}>Reason (Optional)</Label>
        <Textarea
          id={`adjust-reason-${item.id}`}
          name="reason"
          placeholder="e.g., Stock intake, Damaged goods, Sale correction"
        />
        {state.errors?.reason && (
          <p className="text-sm text-red-500 mt-1">
            {state.errors.reason.join(", ")}
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
