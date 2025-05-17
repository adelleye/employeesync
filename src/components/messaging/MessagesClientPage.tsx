"use client";

import React, { useState, useEffect } from "react";
import ThreadList from "./ThreadList";
import MessageView from "./MessageView";
// import CreateThreadForm from "./CreateThreadForm"; // Optional for later
// import { Button } from "@/components/ui/button";
// import { PlusCircle } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";

// Define proper Thread type based on your schema
export interface ThreadData {
  id: string;
  name: string;
  companyId: string;
  shiftId?: string | null;
  isGeneral: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  // messages?: MessageData[]; // If fetching messages along with threads
}

interface MessagesClientPageProps {
  initialThreads: ThreadData[];
  currentUserId: string; // From Supabase auth user
  companyId: string;
  initialSelectedThreadId?: string | null;
}

export default function MessagesClientPage({
  initialThreads,
  currentUserId,
  companyId,
  initialSelectedThreadId,
}: MessagesClientPageProps) {
  const [threads, setThreads] = useState<ThreadData[]>(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialSelectedThreadId || null
  );
  // const [showCreateThreadDialog, setShowCreateThreadDialog] = useState(false);

  useEffect(() => {
    // Sort threads: #general first, then by updatedAt descending
    const sortedThreads = [...initialThreads].sort((a, b) => {
      if (a.isGeneral && !b.isGeneral) return -1;
      if (!a.isGeneral && b.isGeneral) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    setThreads(sortedThreads);

    // If initialSelectedThreadId is provided and valid, it's already set.
    // Otherwise, select #general thread by default if it exists, or first thread.
    if (!initialSelectedThreadId) {
      const generalThread = sortedThreads.find((t) => t.isGeneral);
      if (generalThread) {
        setSelectedThreadId(generalThread.id);
      } else if (sortedThreads.length > 0) {
        setSelectedThreadId(sortedThreads[0].id);
      }
    } else if (
      initialSelectedThreadId &&
      !sortedThreads.find((t) => t.id === initialSelectedThreadId)
    ) {
      // If initialSelectedThreadId was passed but not found in threads (e.g. old/invalid shiftId param)
      // then fall back to general or first.
      const generalThread = sortedThreads.find((t) => t.isGeneral);
      if (generalThread) {
        setSelectedThreadId(generalThread.id);
      } else if (sortedThreads.length > 0) {
        setSelectedThreadId(sortedThreads[0].id);
      }
    }
    // If initialSelectedThreadId is valid and present in initialThreads, it will be used by useState initial value.
  }, [initialThreads, initialSelectedThreadId]);

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  // const handleThreadCreated = (newThread: ThreadData) => { // Assuming action returns the new thread or we refetch
  //   // For now, just refetching all threads from server by navigating or full page refresh via key
  //   // A more sophisticated approach would be to optimistically add or use router.refresh()
  //   // and ensure the parent page re-fetches.
  //   // For simplicity, if createThreadAction revalidates the path, this component might re-render
  //   // if its key changes (e.g. key={companyId} on parent page).
  //   setShowCreateThreadDialog(false);
  //   // Potentially add to threads list optimistically or rely on re-fetch from page.tsx
  // };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(250px,1fr)_3fr] gap-0 h-full flex-grow min-h-0 border rounded-lg overflow-hidden">
      <div className="md:col-span-1 bg-muted/30 p-4 flex flex-col border-r overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Channels</h2>
          {/* Optional: Button to create new non-general, non-shift thread */}
          {/* <Dialog open={showCreateThreadDialog} onOpenChange={setShowCreateThreadDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <PlusCircle className="h-4 w-4 mr-1" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Channel</DialogTitle></DialogHeader>
              <CreateThreadForm onThreadCreated={handleThreadCreated} />
            </DialogContent>
          </Dialog> */}
        </div>
        <ThreadList
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={handleSelectThread}
        />
      </div>
      <div className="md:col-span-1 bg-background flex flex-col overflow-y-auto">
        <MessageView
          selectedThreadId={selectedThreadId}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
