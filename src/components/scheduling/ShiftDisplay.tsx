"use client";

import React, { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InferSelectModel } from "drizzle-orm";
import { employees, roles, locations } from "@/lib/db/schema";
import { updateShift, deleteShift } from "@/app/actions/scheduleActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

// Export the Shift type definition
export type Shift = {
  id: string;
  employeeId: string;
  roleId?: string | null; // Make roleId optional
  locationId: string | null;
  startsAt: Date;
  endsAt: Date;
  notes?: string;
};

// Use InferSelectModel for related data types
type Employee = InferSelectModel<typeof employees>;
type Role = InferSelectModel<typeof roles>;
type Location = InferSelectModel<typeof locations>;

interface ShiftDisplayProps {
  shifts: Shift[];
  employees: Employee[];
  roles: Role[];
  locations: Location[];
  companyId: string;
  onRefresh?: () => void; // callback to refresh list after edit/delete
}

export default function ShiftDisplay({
  shifts,
  employees,
  roles,
  locations,
  companyId,
  onRefresh,
}: ShiftDisplayProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Set up the virtualizer
  const rowVirtualizer = useVirtualizer({
    count: shifts ? shifts.length : 0, // Handle shifts potentially being null/undefined initially
    getScrollElement: () => parentRef.current,
    estimateSize: () => 210, // Estimate height of each card+table item (adjust as needed)
    overscan: 5, // Render a few items outside the viewport
  });

  if (!shifts || shifts.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Shifts Found</AlertTitle>
        <AlertDescription>
          There are no shifts scheduled for this company yet.
        </AlertDescription>
      </Alert>
    );
  }

  // Helper maps for quick lookup
  const employeeMap = new Map(employees.map((e) => [e.id, e.name]));
  const roleMap = new Map(roles.map((r) => [r.id, r.name]));
  const locationMap = new Map(locations.map((l) => [l.id, l.name]));

  const formatTime = (date: Date) => {
    // Explicitly set locale to en-US for consistency
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    // Explicitly set locale to en-US for consistency
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto space-y-6"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const shift = shifts[virtualItem.index];
          return (
            <div
              key={shift.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="px-1 py-1"
            >
              <Card>
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-lg">
                    {formatDate(shift.startsAt)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-1 px-2">Time</TableHead>
                        <TableHead className="py-1 px-2">Employee</TableHead>
                        <TableHead className="py-1 px-2">Role</TableHead>
                        <TableHead className="py-1 px-2">Location</TableHead>
                        <TableHead className="py-1 px-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="py-1 px-2">
                          {formatTime(shift.startsAt)} -{" "}
                          {formatTime(shift.endsAt)}
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          {employeeMap.get(shift.employeeId) ||
                            "Unknown Employee"}
                        </TableCell>
                        <TableCell className="py-1 px-2">Role TBD</TableCell>
                        <TableCell className="py-1 px-2">
                          {shift.locationId
                            ? locationMap.get(shift.locationId) ||
                              "Unknown Location"
                            : "-"}
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditShift(shift);
                              setEditForm({
                                shiftId: shift.id,
                                employeeId: shift.employeeId,
                                locationId: shift.locationId ?? "__NONE__",
                                startsAt: format(
                                  shift.startsAt,
                                  "yyyy-MM-dd'T'HH:mm"
                                ),
                                endsAt: format(
                                  shift.endsAt,
                                  "yyyy-MM-dd'T'HH:mm"
                                ),
                                notes: shift.notes || "",
                              });
                              setEditError(null);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="ml-2"
                            disabled={deleteLoading === shift.id}
                            onClick={async () => {
                              setDeleteLoading(shift.id);
                              const res = await deleteShift(shift.id);
                              setDeleteLoading(null);
                              if (onRefresh) onRefresh();
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      {/* Edit Modal */}
      <Dialog
        open={!!editShift}
        onOpenChange={(open) => {
          if (!open) setEditShift(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setEditLoading(true);
              setEditError(null);
              const formData = new FormData();
              formData.set("shiftId", editForm.shiftId);
              formData.set("employeeId", editForm.employeeId);
              formData.set("locationId", editForm.locationId);
              formData.set("startsAt", editForm.startsAt);
              formData.set("endsAt", editForm.endsAt);
              formData.set("notes", editForm.notes);
              const res = await updateShift(undefined, formData);
              setEditLoading(false);
              if (res.status === "success") {
                setEditShift(null);
                if (onRefresh) onRefresh();
              } else {
                setEditError(res.message);
              }
            }}
          >
            <div className="space-y-2">
              <label>
                Employee
                <select
                  className="w-full"
                  value={editForm.employeeId}
                  onChange={(e) =>
                    setEditForm((f: any) => ({
                      ...f,
                      employeeId: e.target.value,
                    }))
                  }
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Location
                <select
                  className="w-full"
                  value={editForm.locationId}
                  onChange={(e) =>
                    setEditForm((f: any) => ({
                      ...f,
                      locationId: e.target.value,
                    }))
                  }
                >
                  <option value="__NONE__">None</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Start
                <Input
                  type="datetime-local"
                  value={editForm.startsAt}
                  onChange={(e) =>
                    setEditForm((f: any) => ({
                      ...f,
                      startsAt: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                End
                <Input
                  type="datetime-local"
                  value={editForm.endsAt}
                  onChange={(e) =>
                    setEditForm((f: any) => ({ ...f, endsAt: e.target.value }))
                  }
                />
              </label>
              <label>
                Notes
                <Input
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((f: any) => ({ ...f, notes: e.target.value }))
                  }
                />
              </label>
              {editError && (
                <div className="text-red-500 text-sm">{editError}</div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditShift(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
