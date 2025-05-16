export type LocationFormState = {
  status: "success" | "error";
  message: string;
  errors?: {
    id?: string[];
    name?: string[];
    server?: string[]; // For general server-side errors
  };
};

// Add RoleFormState
export type RoleFormState = {
  status: "success" | "error";
  message: string;
  errors?: {
    id?: string[]; // For ID-related errors in update/delete
    name?: string[]; // For name validation errors
    server?: string[]; // For general server-side errors
  };
};
