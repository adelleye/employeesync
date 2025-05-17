import { getUserAndCompany } from "@/lib/auth/getUserAndCompany";
import { db } from "@/lib/db";
import { threads as threadsTable, shifts } from "@/lib/db/schema"; // Added shifts
import { eq, desc, and } from "drizzle-orm"; // Added and
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  NotAuthenticatedError,
  CompanyNotFoundError,
  AppError,
} from "@/lib/errors";
import MessagesClientPage, {
  ThreadData,
} from "@/components/messaging/MessagesClientPage"; // Import client page and type

// TODO: Import UI components for messaging once created
// import MessageView from "@/components/messaging/MessageView";
// import ThreadList from "@/components/messaging/ThreadList";

export const dynamic = "force-dynamic"; // Ensure fresh data on each load

async function getOrCreateShiftThread(
  companyId: string,
  shiftId: string
): Promise<ThreadData | null> {
  // Check if thread for this shift already exists
  let shiftThread = await db.query.threads.findFirst({
    where: and(
      eq(threadsTable.companyId, companyId),
      eq(threadsTable.shiftId, shiftId)
    ),
  });

  if (shiftThread) {
    return {
      ...shiftThread,
      createdAt: shiftThread.createdAt.toISOString(),
      updatedAt: shiftThread.updatedAt.toISOString(),
    } as ThreadData;
  }

  // If not, try to create it. First, ensure the shift exists and belongs to the company.
  const shiftExists = await db.query.shifts.findFirst({
    where: and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId)),
    columns: { id: true, companyId: true }, // Only need to confirm existence and ownership
  });

  if (!shiftExists) {
    console.warn(
      `Shift ${shiftId} not found for company ${companyId} when trying to create thread.`
    );
    return null;
  }

  try {
    const [newThread] = await db
      .insert(threadsTable)
      .values({
        name: `Discussion: Shift ${shiftId.substring(0, 8)}...`, // Or fetch shift details for a better name
        companyId: companyId,
        shiftId: shiftId,
        isGeneral: false,
      })
      .returning();
    if (newThread) {
      return {
        ...newThread,
        createdAt: newThread.createdAt.toISOString(),
        updatedAt: newThread.updatedAt.toISOString(),
      } as ThreadData;
    }
  } catch (error) {
    // Handle potential unique constraint violation if another process created it just now
    if (error instanceof Error && error.message.includes("unique constraint")) {
      // Re-fetch, it likely exists now
      shiftThread = await db.query.threads.findFirst({
        where: and(
          eq(threadsTable.companyId, companyId),
          eq(threadsTable.shiftId, shiftId)
        ),
      });
      if (shiftThread)
        return {
          ...shiftThread,
          createdAt: shiftThread.createdAt.toISOString(),
          updatedAt: shiftThread.updatedAt.toISOString(),
        } as ThreadData;
    }
    console.error(`Failed to create thread for shift ${shiftId}:`, error);
    return null;
  }
  return null;
}

async function getThreadsForCompany(companyId: string): Promise<ThreadData[]> {
  const companyThreads = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.companyId, companyId))
    .orderBy(desc(threadsTable.isGeneral), desc(threadsTable.updatedAt));
  return companyThreads.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  })) as ThreadData[];
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  let activeCompanyId: string = "";
  let currentUserId: string = "";
  let initialThreads: ThreadData[] = [];
  let errorOccurred: { title: string; description: string } | null = null;
  let preSelectedThreadId: string | null = null;

  try {
    const { user, activeCompany } = await getUserAndCompany();
    if (!user) throw new NotAuthenticatedError();
    if (!activeCompany) throw new CompanyNotFoundError();
    activeCompanyId = activeCompany.id;
    currentUserId = user.id;

    initialThreads = await getThreadsForCompany(activeCompanyId);

    const targetShiftId =
      typeof searchParams?.shiftId === "string" ? searchParams.shiftId : null;

    if (targetShiftId) {
      const shiftThread = await getOrCreateShiftThread(
        activeCompanyId,
        targetShiftId
      );
      if (shiftThread) {
        preSelectedThreadId = shiftThread.id;
        // Ensure this thread is in the initialThreads list if it was just created
        if (!initialThreads.find((t) => t.id === shiftThread.id)) {
          initialThreads.unshift(shiftThread); // Add to the beginning for visibility
        }
      } else {
        // Optional: Add a user-facing error or message if shift thread couldn't be found/created
        console.warn(
          `Could not find or create thread for shiftId: ${targetShiftId}`
        );
      }
    }

    const generalThread = initialThreads.find((t) => t.isGeneral);
    if (!generalThread) {
      try {
        const [newGenThread] = await db
          .insert(threadsTable)
          .values({
            name: "#general",
            companyId: activeCompanyId,
            isGeneral: true,
          })
          .returning();
        if (newGenThread) {
          const formattedNewGeneralThread = {
            ...newGenThread,
            createdAt: newGenThread.createdAt.toISOString(),
            updatedAt: newGenThread.updatedAt.toISOString(),
          } as ThreadData;
          initialThreads.unshift(formattedNewGeneralThread);
          if (!preSelectedThreadId)
            preSelectedThreadId = formattedNewGeneralThread.id; // Select if nothing else was pre-selected
        }
      } catch (dbError) {
        console.error("Failed to create #general: ", dbError);
      }
    }

    if (!preSelectedThreadId && initialThreads.length > 0) {
      // Default to #general if it exists and nothing else is selected, otherwise first thread
      const gen = initialThreads.find((t) => t.isGeneral);
      preSelectedThreadId = gen ? gen.id : initialThreads[0].id;
    }
  } catch (error) {
    console.error("[MessagesPage Error]", error);
    if (error instanceof NotAuthenticatedError) {
      redirect("/auth/signin?message=Not Authenticated");
    }
    if (error instanceof CompanyNotFoundError) {
      errorOccurred = {
        title: "Company Not Found",
        description:
          "Could not determine active company. Please select one or create a new one if you haven't.",
      };
    } else if (error instanceof AppError) {
      errorOccurred = { title: "Error", description: error.message };
    } else {
      errorOccurred = {
        title: "Error",
        description: "An unexpected error occurred while loading messages.",
      };
    }
  }

  if (errorOccurred) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>{errorOccurred.title}</AlertTitle>
          <AlertDescription>{errorOccurred.description}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-6">Messages</h1>
      <MessagesClientPage
        key={`${activeCompanyId}-${preSelectedThreadId}`} // Re-key to force re-selection if needed
        initialThreads={initialThreads}
        currentUserId={currentUserId}
        companyId={activeCompanyId}
        initialSelectedThreadId={preSelectedThreadId} // Pass pre-selected ID
      />
    </div>
  );
}
