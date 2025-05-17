"use client";

import { useState, useEffect } from "react";
import {
  EmployeeDataForPage,
  RoleDataForForms,
} from "@/app/dashboard/(protected)/settings/employees/page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  Edit,
  Trash2,
  UserX,
  Users,
  VenetianMaskIcon,
} from "lucide-react";
import { toast } from "sonner";

import AddEmployeeForm from "./AddEmployeeForm";
import EditEmployeeForm from "./EditEmployeeForm";
import { removeEmployeeAction } from "@/app/actions/employeeActions";

interface EmployeesClientPageProps {
  initialEmployees: EmployeeDataForPage[];
  companyRoles: RoleDataForForms[];
  companyId: string;
}

export default function EmployeesClientPage({
  initialEmployees,
  companyRoles,
  companyId,
}: EmployeesClientPageProps) {
  const [employees, setEmployees] =
    useState<EmployeeDataForPage[]>(initialEmployees);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeDataForPage | null>(null);

  useEffect(() => {
    const sortedNewEmployees = [...initialEmployees].sort((a, b) =>
      (a.employeeName || a.userDisplayName || a.email || "").localeCompare(
        b.employeeName || b.userDisplayName || b.email || ""
      )
    );
    setEmployees(sortedNewEmployees);
  }, [initialEmployees]);

  const handleAddEmployeeSuccess = (newEmployee: EmployeeDataForPage) => {
    setEmployees((prev) =>
      [...prev, newEmployee].sort((a, b) =>
        (a.employeeName || a.userDisplayName || a.email || "").localeCompare(
          b.employeeName || b.userDisplayName || b.email || ""
        )
      )
    );
  };

  const handleEditEmployeeSuccess = (updatedEmployee: EmployeeDataForPage) => {
    setEmployees((prev) =>
      prev
        .map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
        .sort((a, b) =>
          (a.employeeName || a.userDisplayName || a.email || "").localeCompare(
            b.employeeName || b.userDisplayName || b.email || ""
          )
        )
    );
  };

  const openEditDialog = (employee: EmployeeDataForPage) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleRemoveEmployee = async (
    employeeId: string,
    employeeNameInfo: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to remove ${employeeNameInfo}? This action cannot be undone and may also remove their associated shifts.`
      )
    )
      return;

    const result = await removeEmployeeAction(employeeId);

    if (result.status === "success") {
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
      toast.success(result.message);
    } else {
      toast.error(
        result.message ||
          "Failed to remove employee. They might have dependent data (e.g. shifts) that needs to be resolved first."
      );
    }
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Manage Employees
        </h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Invite Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Invite New Employee</DialogTitle>
            </DialogHeader>
            <AddEmployeeForm
              roles={companyRoles}
              onSuccess={handleAddEmployeeSuccess}
              onCloseDialog={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <Users className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-50">
            No employees found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by inviting your first employee.
          </p>
          <div className="mt-6">
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="default"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Invite First Employee
              </Button>
            </DialogTrigger>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <ul
            role="list"
            className="divide-y divide-gray-200 dark:divide-gray-700"
          >
            {employees.map((employee) => {
              const displayName =
                employee.employeeName ||
                employee.userDisplayName ||
                "Unnamed Employee";
              const emailDisplay = employee.email || "No email";
              const roleDisplay = employee.roleName || (
                <span className="italic text-gray-500 dark:text-gray-400">
                  No role
                </span>
              );
              return (
                <li
                  key={employee.id}
                  className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <p className="text-md font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                        {displayName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {emailDisplay}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Role: {roleDisplay}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(employee)}
                      >
                        <Edit className="mr-1.5 h-4 w-4" /> Edit Role
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleRemoveEmployee(employee.id, displayName)
                        }
                      >
                        <UserX className="mr-1.5 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selectedEmployee && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Employee Role</DialogTitle>
            </DialogHeader>
            <EditEmployeeForm
              employee={selectedEmployee}
              roles={companyRoles}
              onSuccess={handleEditEmployeeSuccess}
              onCloseDialog={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
