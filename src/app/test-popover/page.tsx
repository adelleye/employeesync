"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TestPopoverPage() {
  const [testDate, setTestDate] = useState<Date | undefined>(new Date());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <div className="p-10">
      <h1 className="mb-4 text-xl">Test Popover Page</h1>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !testDate && "text-muted-foreground"
            )}
            // Removed stopPropagation for this isolated test initially
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {testDate ? format(testDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" style={{ zIndex: 100 }}>
          <Calendar
            mode="single"
            selected={testDate}
            onSelect={(date) => {
              setTestDate(date);
              setIsPopoverOpen(false); // Close popover on select
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="mt-4">
        Selected Date: {testDate ? format(testDate, "PPP") : "None"}
      </div>
    </div>
  );
}
