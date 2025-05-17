"use client";

import React, { useEffect, useState, useRef, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  postMessageAction,
  MessageFormState,
} from "@/app/actions/messageActions";
import { useFormStatus } from "react-dom";

// Define proper Message type based on your schema, including user details
interface Message {
  id: string;
  content: string;
  createdAt: string | Date;
  userId: string;
  user?: {
    // Assuming you join user data (display name, avatar etc.)
    id: string;
    displayName?: string | null;
    // avatarUrl?: string;
  };
  // Add other fields like isOwnMessage, etc.
}

interface MessageViewProps {
  selectedThreadId: string | null;
  // You'll need a way to fetch messages for the selectedThreadId
  // This might involve another server action or client-side fetching
  currentUserId: string; // To determine if a message is from the current user
}

// Dummy function to simulate fetching messages
async function fetchMessagesForThread(threadId: string): Promise<Message[]> {
  console.log(`Fetching messages for thread ${threadId}...`);
  // In a real app, this would call a server action or API endpoint
  // For now, return some dummy data or an empty array
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
  // Example returning empty, or could return a few placeholders
  return [
    // {id: "1", content: "Hello there!", createdAt: new Date().toISOString(), userId: "user1", user: {id: "user1", displayName: "Alice"}},
    // {id: "2", content: "Hi Alice!", createdAt: new Date().toISOString(), userId: "user2", user: {id: "user2", displayName: "Bob"}}
  ];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Send
    </Button>
  );
}

export default function MessageView({
  selectedThreadId,
  currentUserId,
}: MessageViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const initialFormState: MessageFormState = { message: "" };
  const [formState, formAction] = useActionState(
    postMessageAction,
    initialFormState
  );

  useEffect(() => {
    if (selectedThreadId) {
      setIsLoading(true);
      fetchMessagesForThread(selectedThreadId)
        .then(setMessages)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (formState.message === "Message posted successfully.") {
      formRef.current?.reset(); // Reset the form fields
      // Refetch messages for the current thread to show the new one
      if (selectedThreadId) {
        fetchMessagesForThread(selectedThreadId).then(setMessages);
      }
    }
    // Handle formState.errors if needed (e.g., display toast)
  }, [formState, selectedThreadId]);

  if (!selectedThreadId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">
          Select a channel to start messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow p-4 space-y-4">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto my-4" />}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-muted-foreground">
            No messages yet. Be the first to say something!
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.userId === currentUserId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.userId === currentUserId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {msg.user?.displayName || msg.userId}{" "}
                {msg.userId === currentUserId ? "(You)" : ""}
              </p>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs text-muted-foreground/80 mt-1 text-right">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </ScrollArea>
      <div className="p-4 border-t">
        <form
          ref={formRef}
          action={formAction}
          className="flex items-center space-x-2"
        >
          <input type="hidden" name="threadId" value={selectedThreadId} />
          <Textarea
            name="content"
            placeholder="Type your message..."
            rows={1}
            className="flex-grow resize-none"
            required
          />
          <SubmitButton />
        </form>
        {formState.errors?._form && (
          <p className="text-xs text-destructive mt-1">
            {formState.errors._form.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
