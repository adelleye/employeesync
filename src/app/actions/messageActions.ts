"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { threads, messages, users, employees } from "@/lib/db/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import {
  AppError,
  NotAuthenticatedError,
  CompanyNotFoundError,
} from "@/lib/errors";

export interface MessageFormState {
  message: string;
  errors?: {
    content?: string[];
    threadId?: string[];
    _form?: string[];
  };
}

export interface ThreadFormState {
  message: string;
  errors?: {
    name?: string[];
    shiftId?: string[];
    _form?: string[];
  };
}

const CreateThreadSchema = z.object({
  name: z
    .string()
    .min(1, "Thread name cannot be empty.")
    .max(100, "Thread name too long."),
  shiftId: z.string().uuid("Invalid shift ID format.").optional(),
  isGeneral: z.boolean().default(false),
});

export async function createThreadAction(
  prevState: ThreadFormState,
  formData: FormData
): Promise<ThreadFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();

    const validatedFields = CreateThreadSchema.safeParse({
      name: formData.get("name"),
      shiftId: formData.get("shiftId") || undefined, // Ensure undefined if not present
      isGeneral: formData.get("isGeneral") === "true",
    });

    if (!validatedFields.success) {
      return {
        message: "Validation failed.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, shiftId, isGeneral } = validatedFields.data;

    // For #general, ensure it's unique for the company (DB constraint will also help)
    if (isGeneral) {
      const existingGeneralThread = await db
        .select()
        .from(threads)
        .where(
          and(
            eq(threads.companyId, activeCompany.id),
            eq(threads.isGeneral, true)
          )
        )
        .limit(1);
      if (existingGeneralThread.length > 0) {
        return {
          message: "A #general channel already exists for this company.",
          errors: { _form: ["A #general channel already exists."] },
        };
      }
    }

    // For shift-specific threads, ensure uniqueness (DB constraint will also help)
    if (shiftId) {
      const existingShiftThread = await db
        .select()
        .from(threads)
        .where(
          and(
            eq(threads.companyId, activeCompany.id),
            eq(threads.shiftId, shiftId)
          )
        )
        .limit(1);
      if (existingShiftThread.length > 0) {
        return {
          message: "A discussion thread already exists for this shift.",
          errors: {
            _form: ["A discussion thread already exists for this shift."],
          },
        };
      }
    }

    const [newThread] = await db
      .insert(threads)
      .values({
        companyId: activeCompany.id,
        name: isGeneral ? "#general" : name, // Force name for general channel
        shiftId: shiftId,
        isGeneral: isGeneral,
        // createdBy: user.id, // Add if you add a createdBy to threads table
      })
      .returning();

    if (!newThread) {
      throw new AppError("Failed to create thread due to a database error.");
    }

    revalidatePath("/dashboard/messages");
    if (shiftId) {
      revalidatePath(`/dashboard/schedule`); // Or more specific if viewing a shift
    }

    return { message: "Thread created successfully." };
  } catch (error) {
    console.error("[createThreadAction Error]", error);
    if (
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      // Redirect or specific handling might be needed if called from a page,
      // but for now, return form error.
      // For critical errors like these, re-throwing or redirecting might be better.
      // For now, we'll set a form error.
      return {
        message: "Authentication or company context error.",
        errors: { _form: [error.message] },
      };
    }
    if (error instanceof AppError) {
      return { message: error.message, errors: { _form: [error.message] } };
    }
    return {
      message: "An unexpected error occurred.",
      errors: { _form: ["Failed to create thread. Please try again."] },
    };
  }
}

const PostMessageSchema = z.object({
  threadId: z.string().uuid("Invalid thread ID."),
  content: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message too long."),
});

export async function postMessageAction(
  prevState: MessageFormState,
  formData: FormData
): Promise<MessageFormState> {
  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();

    const validatedFields = PostMessageSchema.safeParse({
      threadId: formData.get("threadId"),
      content: formData.get("content"),
    });

    if (!validatedFields.success) {
      return {
        message: "Validation failed.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { threadId, content } = validatedFields.data;

    // Verify the thread exists and belongs to the active company
    const targetThread = await db
      .select({ id: threads.id, companyId: threads.companyId })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (targetThread.length === 0) {
      return {
        message: "Thread not found.",
        errors: { _form: ["Thread not found."] },
      };
    }
    if (targetThread[0].companyId !== activeCompany.id) {
      // This should ideally not happen if UIs only show relevant threads,
      // but it's a good server-side check.
      console.warn(
        `User ${user.id} company ${activeCompany.id} attempted to post to thread ${threadId} of company ${targetThread[0].companyId}`
      );
      return {
        message: "Permission denied.",
        errors: {
          _form: ["You do not have permission to post in this thread."],
        },
      };
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        threadId: threadId,
        userId: user.id, // The Supabase auth user ID
        content: content,
        companyId: activeCompany.id, // Store companyId on message for RLS and direct queries
      })
      .returning();

    if (!newMessage) {
      throw new AppError("Failed to post message due to a database error.");
    }

    revalidatePath("/dashboard/messages");
    const threadDetails = await db.query.threads.findFirst({
      where: eq(threads.id, threadId),
    });
    if (threadDetails?.shiftId) {
      revalidatePath(`/dashboard/schedule`);
    }

    return { message: "Message posted successfully." };
  } catch (error) {
    console.error("[postMessageAction Error]", error);
    if (
      error instanceof NotAuthenticatedError ||
      error instanceof CompanyNotFoundError
    ) {
      return {
        message: "Authentication or company context error.",
        errors: { _form: [error.message] },
      };
    }
    if (error instanceof AppError) {
      return { message: error.message, errors: { _form: [error.message] } };
    }
    return {
      message: "An unexpected error occurred.",
      errors: { _form: ["Failed to post message. Please try again."] },
    };
  }
}
