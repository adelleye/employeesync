"use client";

import React, { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  createThreadAction,
  ThreadFormState,
} from "@/app/actions/messageActions";

interface CreateThreadFormProps {
  shiftId?: string; // Optional: for creating a shift-specific thread
  isGeneral?: boolean; // For creating the #general channel
  onThreadCreated?: (newThread: any) => void; // Callback, newThread type to be defined
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Create Channel
    </Button>
  );
}

export default function CreateThreadForm({
  shiftId,
  isGeneral,
  onThreadCreated,
}: CreateThreadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialFormState: ThreadFormState = { message: "" };
  const [formState, formAction] = useActionState(
    createThreadAction,
    initialFormState
  );

  React.useEffect(() => {
    if (formState.message === "Thread created successfully.") {
      formRef.current?.reset();
      if (onThreadCreated) {
        // The actual newThread data isn't returned by the action currently,
        // so we might need to refetch or pass identifier.
        onThreadCreated({}); // Placeholder
      }
      // Potentially close a dialog if this form is in one
    }
    // Handle formState.errors, e.g., display toast
  }, [formState, onThreadCreated]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {isGeneral ? (
        <input type="hidden" name="isGeneral" value="true" />
      ) : shiftId ? (
        <input type="hidden" name="shiftId" value={shiftId} />
      ) : null}

      <div>
        <Label htmlFor="threadName">Channel Name</Label>
        <Input
          id="threadName"
          name="name"
          placeholder={
            shiftId
              ? "e.g., Discussion for Shift XYZ"
              : isGeneral
              ? "#general"
              : "e.g., New Project Updates"
          }
          required
          defaultValue={isGeneral ? "#general" : undefined}
          readOnly={isGeneral} // #general name is fixed
        />
        {formState.errors?.name && (
          <p className="text-xs text-destructive mt-1">
            {formState.errors.name.join(", ")}
          </p>
        )}
      </div>

      {!isGeneral && !shiftId && (
        <div className="flex items-center space-x-2">
          <Checkbox id="isGeneralChannel" name="isGeneral" value="true" />
          <Label
            htmlFor="isGeneralChannel"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Make this the #general company channel?
          </Label>
        </div>
      )}

      <SubmitButton />
      {formState.errors?._form && (
        <p className="text-xs text-destructive mt-1">
          {formState.errors._form.join(", ")}
        </p>
      )}
    </form>
  );
}
