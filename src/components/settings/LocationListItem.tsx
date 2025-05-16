"use client"; // Mark this component as a Client Component

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteLocationButton } from "@/components/settings/DeleteLocationButton";
import EditLocationForm from "@/components/settings/EditLocationForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define the expected shape of the location prop
// Keep consistent with the data structure passed from the page
interface LocationData {
  id: string;
  // companyId is likely not needed here, keep it simple
  name: string;
}

interface LocationListItemProps {
  location: LocationData;
}

export function LocationListItem({ location }: LocationListItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <li className="flex items-center justify-between p-4 border rounded-md">
      <span className="font-medium">{location.name}</span>
      <div className="flex space-x-2">
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>
                Make changes to the location name. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <EditLocationForm
              locationId={location.id}
              currentName={location.name}
              onSuccess={() => setIsEditDialogOpen(false)} // Close dialog on success
            />
          </DialogContent>
        </Dialog>

        {/* Delete Button */}
        <DeleteLocationButton
          locationId={location.id}
          locationName={location.name}
        />
      </div>
    </li>
  );
}
