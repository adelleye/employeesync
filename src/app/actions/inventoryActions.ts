"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { items, stockAdjustments, locations } from "@/lib/db/schema";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import {
  AppError,
  NotAuthenticatedError,
  CompanyNotFoundError,
} from "@/lib/errors";
import { revalidateTag } from "next/cache";
import { and, eq, sql, asc } from "drizzle-orm";
import type { ItemForInventoryPage } from "@/app/dashboard/(protected)/inventory/page";

// Form state type
export type InventoryFormState<T = any> = {
  status: "success" | "error" | "idle";
  message: string;
  errors?: z.ZodError<T>["formErrors"]["fieldErrors"];
  data?: T;
};

// Zod Schemas
const ItemSchemaBase = z.object({
  name: z.string().min(1, "Item name is required").max(255),
  sku: z.string().max(100).optional().nullable(),
  reorderPoint: z.coerce
    .number()
    .int("Reorder point must be a whole number.")
    .optional()
    .nullable(),
  locationId: z.string().uuid("Invalid location ID").optional().nullable(),
});

const CreateItemSchema = ItemSchemaBase;
const UpdateItemSchema = ItemSchemaBase.extend({
  id: z.string().uuid("Item ID is required for updates"),
});

const AdjustStockSchema = z.object({
  itemId: z.string().uuid("Item ID is required"),
  delta: z.coerce.number().int("Adjustment amount must be a whole number."),
  reason: z.string().max(255, "Reason is too long").optional().nullable(),
});

// Server Actions

export async function createItem(
  prevState: InventoryFormState | undefined,
  formData: FormData
): Promise<InventoryFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;

    const validatedFields = CreateItemSchema.safeParse({
      name: formData.get("name"),
      sku: formData.get("sku") || null,
      reorderPoint: formData.get("reorderPoint")
        ? Number(formData.get("reorderPoint"))
        : null,
      locationId: formData.get("locationId") || null,
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid item data.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, sku, reorderPoint, locationId } = validatedFields.data;

    if (sku) {
      const existingItemBySku = await db.query.items.findFirst({
        where: and(eq(items.companyId, companyId), eq(items.sku, sku)),
      });
      if (existingItemBySku) {
        return {
          status: "error",
          message: "An item with this SKU already exists in your company.",
          errors: { sku: ["SKU must be unique within the company."] },
        };
      }
    }

    const [newItem] = await db
      .insert(items)
      .values({
        companyId,
        name,
        sku,
        reorderPoint,
        locationId,
        qtyOnHand: 0,
      })
      .returning();

    revalidateTag(`company-${companyId}-inventory`);
    revalidateTag(`company-${companyId}-item_alerts`);

    return {
      status: "success",
      message: "Item created successfully.",
      data: newItem,
    };
  } catch (error) {
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to create item:", error);
    return {
      status: "error",
      message: "Database error: Failed to create item.",
    };
  }
}

export async function updateItem(
  prevState: InventoryFormState | undefined,
  formData: FormData
): Promise<InventoryFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;
    const itemId = formData.get("id") as string;

    const validatedFields = UpdateItemSchema.safeParse({
      id: itemId,
      name: formData.get("name"),
      sku: formData.get("sku") || null,
      reorderPoint: formData.get("reorderPoint")
        ? Number(formData.get("reorderPoint"))
        : null,
      locationId: formData.get("locationId") || null,
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid item data for update.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { id, name, sku, reorderPoint, locationId } = validatedFields.data;

    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.companyId, companyId)),
    });

    if (!existingItem) {
      return { status: "error", message: "Item not found or access denied." };
    }

    if (sku && sku !== existingItem.sku) {
      const otherItemWithSku = await db.query.items.findFirst({
        where: and(
          eq(items.companyId, companyId),
          eq(items.sku, sku),
          sql`${items.id} != ${id}`
        ),
      });
      if (otherItemWithSku) {
        return {
          status: "error",
          message: "Another item with this SKU already exists.",
          errors: { sku: ["SKU must be unique within the company."] },
        };
      }
    }

    const [updatedItem] = await db
      .update(items)
      .set({
        name,
        sku,
        reorderPoint,
        locationId,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, id), eq(items.companyId, companyId)))
      .returning();

    revalidateTag(`company-${companyId}-inventory`);
    revalidateTag(`company-${companyId}-item_alerts`);

    return {
      status: "success",
      message: "Item updated successfully.",
      data: updatedItem,
    };
  } catch (error) {
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to update item:", error);
    return {
      status: "error",
      message: "Database error: Failed to update item.",
    };
  }
}

export async function deleteItem(
  itemId: string
): Promise<Omit<InventoryFormState, "errors" | "data">> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;

    if (!itemId || typeof itemId !== "string") {
      return { status: "error", message: "Invalid Item ID provided." };
    }

    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, itemId), eq(items.companyId, companyId)),
    });

    if (!existingItem) {
      return { status: "error", message: "Item not found or access denied." };
    }

    await db
      .delete(items)
      .where(and(eq(items.id, itemId), eq(items.companyId, companyId)));

    revalidateTag(`company-${companyId}-inventory`);
    revalidateTag(`company-${companyId}-item_alerts`);

    return { status: "success", message: "Item deleted successfully." };
  } catch (error) {
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to delete item:", error);
    return {
      status: "error",
      message: "Database error: Failed to delete item.",
    };
  }
}

export async function adjustStock(
  prevState: InventoryFormState | undefined,
  formData: FormData
): Promise<InventoryFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    const companyId = activeCompany.id;

    const validatedFields = AdjustStockSchema.safeParse({
      itemId: formData.get("itemId"),
      delta: formData.get("delta") ? Number(formData.get("delta")) : undefined,
      reason: formData.get("reason") || null,
    });

    if (!validatedFields.success) {
      return {
        status: "error",
        message: "Invalid stock adjustment data.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { itemId, delta, reason } = validatedFields.data;

    const itemToAdjust = await db.query.items.findFirst({
      where: and(eq(items.id, itemId), eq(items.companyId, companyId)),
    });

    if (!itemToAdjust) {
      return { status: "error", message: "Item not found or access denied." };
    }

    if (delta === 0) {
      return {
        status: "error",
        message: "Adjustment amount cannot be zero.",
        errors: { delta: ["Delta cannot be zero."] },
      };
    }

    const newQtyOnHand = (itemToAdjust.qtyOnHand || 0) + delta;

    if (newQtyOnHand < 0) {
      return {
        status: "error",
        message: "Stock quantity cannot go below zero.",
        errors: { delta: ["Resulting quantity cannot be negative."] },
      };
    }

    const updatedItem = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(items)
        .set({ qtyOnHand: newQtyOnHand, updatedAt: new Date() })
        .where(and(eq(items.id, itemId), eq(items.companyId, companyId)))
        .returning();

      if (!updated) {
        throw new AppError(
          "Failed to update item quantity during transaction."
        );
      }

      await tx.insert(stockAdjustments).values({
        itemId,
        delta,
        reason,
      });

      return updated;
    });

    revalidateTag(`company-${companyId}-inventory`);
    revalidateTag(`company-${companyId}-item_alerts`);

    return {
      status: "success",
      message: "Stock adjusted successfully.",
      data: updatedItem,
    };
  } catch (error) {
    if (
      error instanceof AppError ||
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return { status: "error", message: error.message };
    }
    console.error("Failed to adjust stock:", error);
    return {
      status: "error",
      message: "Database error: Failed to adjust stock.",
    };
  }
}

export async function fetchItemsPaginated({
  companyId,
  limit,
  offset,
}: {
  companyId: string;
  limit: number;
  offset: number;
}): Promise<ItemForInventoryPage[] | null> {
  try {
    const { activeCompany } = await getUserAndCompany();
    if (!activeCompany || activeCompany.id !== companyId) {
      console.warn(
        `fetchItemsPaginated: Permission denied or company mismatch. Requested: ${companyId}, Active: ${activeCompany?.id}`
      );
      return null;
    }

    const paginatedItems = await db.query.items.findMany({
      where: eq(items.companyId, companyId),
      orderBy: [asc(items.name)],
      limit: limit,
      offset: offset,
      with: {
        location: {
          columns: {
            name: true,
          },
        },
      },
    });
    return paginatedItems as ItemForInventoryPage[];
  } catch (error) {
    console.error("Error fetching paginated items:", error);
    return null;
  }
}

export async function getTotalItemCount(companyId: string): Promise<number> {
  try {
    const { activeCompany } = await getUserAndCompany();
    if (!activeCompany || activeCompany.id !== companyId) {
      console.warn(
        `getTotalItemCount: Permission denied or company mismatch. Requested: ${companyId}, Active: ${activeCompany?.id}`
      );
      return 0;
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.companyId, companyId));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error fetching total item count:", error);
    return 0;
  }
}
