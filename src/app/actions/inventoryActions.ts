"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { items, stockAdjustments, locations } from "@/lib/db/schema";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { AppError } from "@/lib/errors";
import { revalidateCompanyPaths } from "@/lib/cache/revalidateCompanyPaths";
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
    const { activeCompany } = await getUserAndCompany();
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

    revalidateCompanyPaths(companyId);
    return {
      status: "success",
      message: "Item created successfully.",
      data: newItem,
    };
  } catch (error) {
    if (error instanceof AppError) {
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
    const { activeCompany } = await getUserAndCompany();
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

    revalidateCompanyPaths(companyId);
    return {
      status: "success",
      message: "Item updated successfully.",
      data: updatedItem,
    };
  } catch (error) {
    if (error instanceof AppError) {
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
    const { activeCompany } = await getUserAndCompany();
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

    revalidateCompanyPaths(companyId);
    return { status: "success", message: "Item deleted successfully." };
  } catch (error) {
    if (error instanceof AppError) {
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
    const { activeCompany } = await getUserAndCompany();
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

    if (delta === 0) {
      return {
        status: "error",
        message: "Delta cannot be zero for a stock adjustment.",
        errors: { delta: ["Delta must be a non-zero integer."] },
      };
    }

    const updatedItemData = await db.transaction(async (tx) => {
      // Manually construct the select with FOR UPDATE if forUpdate() method is problematic with types
      const result = await tx.execute(sql`
        SELECT * FROM ${items}
        WHERE ${items.id} = ${itemId} AND ${items.companyId} = ${companyId}
        FOR UPDATE
      `);

      const currentItem = result.rows[0] as
        | typeof items.$inferSelect
        | undefined;

      if (!currentItem) {
        throw new AppError(
          "Item not found or access denied for stock adjustment."
        );
      }

      const newQtyOnHand = (currentItem.qtyOnHand || 0) + delta;
      if (newQtyOnHand < 0) {
        throw new AppError(
          "Stock quantity cannot be negative after adjustment.",
          "qtyOnHand"
        );
      }

      const [updated] = await tx
        .update(items)
        .set({
          qtyOnHand: newQtyOnHand,
          updatedAt: new Date(),
        })
        .where(eq(items.id, itemId))
        .returning();

      await tx.insert(stockAdjustments).values({
        itemId,
        delta,
        reason,
      });
      return updated;
    });
    revalidateCompanyPaths(companyId);
    return {
      status: "success",
      message: "Stock adjusted successfully.",
      data: updatedItemData,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return {
        status: "error",
        message: error.message,
        errors:
          error.field === "qtyOnHand" ? { delta: [error.message] } : undefined,
      };
    }
    console.error("Failed to adjust stock:", error);
    return {
      status: "error",
      message: "Database error: Failed to adjust stock.",
    };
  }
}

// Server Action to fetch paginated items
export async function fetchItemsPaginated({
  companyId,
  limit,
  offset,
}: {
  companyId: string;
  limit: number;
  offset: number;
}): Promise<ItemForInventoryPage[] | null> {
  // No need to call getUserAndCompany() here if companyId is passed correctly
  // and RLS is set up based on a custom claim set by getUserAndCompany during initial page load.
  // However, if direct access to this action is possible without prior auth context,
  // you MIGHT need to re-verify company access, but that makes it less efficient for this specific use case.
  // For now, assume companyId is validated from the client context which got it from an authenticated page load.
  try {
    const itemsData = await db.query.items.findMany({
      where: eq(items.companyId, companyId),
      orderBy: [asc(items.name)], // Ensure consistent ordering
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

    const result = itemsData.map((item) => ({
      ...item,
      locationName: item.location?.name ?? null,
    }));
    return result;
  } catch (error) {
    console.error("Failed to fetch paginated items:", error);
    // In a real app, you might throw a specific error or return a structured error response
    return null; // Or throw error to be caught by client
  }
}
