export class AppError extends Error {
  public field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "AppError";
    if (field) {
      this.field = field;
    }
  }
}

export class NotAuthenticatedError extends AppError {
  constructor() {
    super("User is not authenticated.");
    this.name = "NotAuthenticatedError";
  }
}

export class CompanyNotFoundError extends AppError {
  constructor(companyId?: string) {
    super(
      companyId
        ? `Company not found: ${companyId}`
        : "No company found for user."
    );
    this.name = "CompanyNotFoundError";
  }
}

export class MultipleCompaniesError extends AppError {
  companyIds: string[];
  constructor(companyIds: string[]) {
    super("User belongs to multiple companies. Specify a companyId.");
    this.name = "MultipleCompaniesError";
    this.companyIds = companyIds;
  }
}
