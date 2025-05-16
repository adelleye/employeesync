"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import ShiftDisplay, { Shift } from "@/components/scheduling/ShiftDisplay";
import AddShiftForm from "@/components/scheduling/AddShiftForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface ScheduleTabsProps {
  shifts: Shift[];
  employees: any[];
  roles: any[];
  locations: any[];
  companyId: string;
  shiftTemplates: any[];
}

export default function ScheduleTabs({
  shifts,
  employees,
  roles,
  locations,
  companyId,
  shiftTemplates,
}: ScheduleTabsProps) {
  const [activeTab, setActiveTab] = useState<"schedule" | "templates">(
    "schedule"
  );

  return (
    <div className="container mx-auto p-4 space-y-8">
      {/* Tab Switcher */}
      <div className="flex gap-4 mb-4">
        <Button
          variant={activeTab === "schedule" ? "default" : "outline"}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule
        </Button>
        <Button
          variant={activeTab === "templates" ? "default" : "outline"}
          onClick={() => setActiveTab("templates")}
        >
          Templates
        </Button>
      </div>
      {/* Tab Content */}
      {activeTab === "schedule" && (
        <>
          {/* Top Section: Title and Add Shift Button/Dialog Trigger */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
            <Dialog modal={false}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Shift</DialogTitle>
                  <DialogDescription>
                    Fill in the details for the new shift.
                  </DialogDescription>
                </DialogHeader>
                <AddShiftForm employees={employees} locations={locations} />
              </DialogContent>
            </Dialog>
          </div>
          {/* Existing Shifts Display */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Existing Shifts</h2>
            <ShiftDisplay
              shifts={shifts}
              employees={employees}
              roles={roles}
              locations={locations}
              companyId={companyId}
            />
          </div>
        </>
      )}
      {activeTab === "templates" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Shift Templates</h2>
          <ul className="space-y-2">
            {shiftTemplates.length === 0 ? (
              <li className="text-gray-500">No templates yet.</li>
            ) : (
              shiftTemplates.map((tpl) => (
                <li
                  key={tpl.id}
                  className="border rounded p-3 flex items-center justify-between"
                >
                  <span>
                    <span className="font-semibold">{tpl.name}</span> &mdash;{" "}
                    {tpl.startTime} - {tpl.endTime}
                  </span>
                  {/* Edit/Delete buttons will go here */}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
