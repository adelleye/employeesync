"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { createShift } from "@/app/actions/scheduleActions";
import { type ShiftFormState } from "@/app/actions/scheduleActions";
// Import types directly from schema using InferSelectModel
import { type employees, type locations } from "@/lib/db/schema";
import { type InferSelectModel } from "drizzle-orm";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Define local types using InferSelectModel
type Employee = InferSelectModel<typeof employees>;
type Location = InferSelectModel<typeof locations>;

const initialState: ShiftFormState = {
  status: "idle",
  message: "",
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending}>
      {pending ? "Adding Shift..." : "Add Shift"}
    </Button>
  );
}

interface AddShiftFormProps {
  // Use the locally defined types
  employees: Pick<Employee, "id" | "name">[];
  locations: Pick<Location, "id" | "name">[];
  onFormSuccess?: () => void; // Optional callback to close dialog
}

export default function AddShiftForm({
  employees,
  locations,
  onFormSuccess,
}: AddShiftFormProps) {
  const [state, formAction] = useActionState(createShift, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  // Add state to control popover visibility
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

  useEffect(() => {
    if (state && state.status !== "idle") {
      if (state.status === "success") {
        toast.success(state.message);
        formRef.current?.reset();
        setStartDate(new Date()); // Reset dates on success
        setEndDate(new Date());
        onFormSuccess?.(); // Call callback to close dialog
      } else if (state.status === "error") {
        const errorDescription = Object.values(state.errors || {})
          .flat()
          .join(" ");
        toast.error(state.message, {
          description: errorDescription || "Please check the form fields.",
        });
      }
    }
  }, [state, onFormSuccess]);

  // Helper function to format date for hidden input (YYYY-MM-DD)
  const formatDateForInput = (date: Date | undefined): string => {
    return date ? format(date, "yyyy-MM-dd") : "";
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Hidden inputs to store the formatted date for the server action */}
      <input
        type="hidden"
        name="startDate"
        value={formatDateForInput(startDate)}
      />
      <input type="hidden" name="endDate" value={formatDateForInput(endDate)} />

      {/* Employee Select */}
      <div>
        <Label htmlFor="employeeId">Employee</Label>
        <Select name="employeeId" required>
          <SelectTrigger id="employeeId">
            <SelectValue placeholder="Select employee..." />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name || `Employee (${emp.id.substring(0, 6)}...)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.employeeId && (
          <p className="text-xs text-red-500 mt-1">
            {state.errors.employeeId.join(", ")}
          </p>
        )}
      </div>

      {/* Location Select (Optional) */}
      <div>
        <Label htmlFor="locationId">Location (Optional)</Label>
        <Select name="locationId">
          <SelectTrigger id="locationId">
            <SelectValue placeholder="Select location (optional)..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__NONE__">-- No Location --</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.locationId && (
          <p className="text-xs text-red-500 mt-1">
            {state.errors.locationId.join(", ")}
          </p>
        )}
      </div>

      {/* Start Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDatePicker">Start Date</Label>
          <Popover
            open={isStartPopoverOpen}
            onOpenChange={(isOpen) => {
              console.log("Start Popover onOpenChange:", isOpen);
              setIsStartPopoverOpen(isOpen);
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? (
                  format(startDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" style={{ zIndex: 100 }}>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  setIsStartPopoverOpen(false); // Close popover on select
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue="09:00"
          />
        </div>
      </div>
      {state.errors?.startsAt && (
        <p className="text-xs text-red-500 -mt-3">
          {state.errors.startsAt.join(", ")}
        </p>
      )}

      {/* End Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="endDatePicker">End Date</Label>
          <Popover
            open={isEndPopoverOpen}
            onOpenChange={(isOpen) => {
              console.log("End Popover onOpenChange:", isOpen);
              setIsEndPopoverOpen(isOpen);
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" style={{ zIndex: 100 }}>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  setEndDate(date);
                  setIsEndPopoverOpen(false); // Close popover on select
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue="17:00"
          />
        </div>
      </div>
      {state.errors?.endsAt && (
        <p className="text-xs text-red-500 -mt-3">
          {state.errors.endsAt.join(", ")}
        </p>
      )}

      {/* Notes Textarea (Optional) */}
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Add any relevant notes for this shift..."
        />
        {state.errors?.notes && (
          <p className="text-xs text-red-500 mt-1">
            {state.errors.notes.join(", ")}
          </p>
        )}
      </div>

      {/* Server Error Display */}
      {state.errors?.server && (
        <p className="text-sm text-red-500">{state.errors.server.join(", ")}</p>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
