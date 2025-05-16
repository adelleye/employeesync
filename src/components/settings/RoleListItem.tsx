"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteRoleButton } from "@/components/settings/DeleteRoleButton";
import EditRoleForm from "@/components/settings/EditRoleForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RoleData {
  id: string;
  name: string;
}

interface RoleListItemProps {
  role: RoleData;
}

export function RoleListItem({ role }: RoleListItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <li className="flex items-center justify-between p-4 border rounded-md">
      <span className="font-medium">{role.name}</span>
      <div className="flex space-x-2">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Make changes to the role name. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <EditRoleForm
              roleId={role.id}
              currentName={role.name}
              onSuccess={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <DeleteRoleButton roleId={role.id} roleName={role.name} />
      </div>
    </li>
  );
}
