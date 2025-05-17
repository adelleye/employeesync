// Placeholder for ThreadList component
import React from "react";

// Define proper Thread type based on your schema
interface Thread {
  id: string;
  name: string;
  isGeneral?: boolean;
  updatedAt?: string | Date;
  // Add other relevant fields like unread count, last message snippet, etc.
}

interface ThreadListProps {
  threads: Thread[];
  selectedThreadId?: string | null;
  onSelectThread: (threadId: string) => void;
}

export default function ThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
}: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No channels available.</p>
    );
  }
  return (
    <ul className="space-y-1">
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            onClick={() => onSelectThread(thread.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${
                selectedThreadId === thread.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
          >
            {thread.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
