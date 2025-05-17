"use client";
import React, { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LuLoader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  postMessageAction,
  MessageFormState,
} from "@/app/actions/messageActions";

interface MessageInputProps {
  threadId: string;
  onMessagePosted?: () => void; // Callback after successful post
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <LuLoader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Send
    </Button>
  );
}

export default function MessageInput({
  threadId,
  onMessagePosted,
}: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialFormState: MessageFormState = { message: "" };
  const [formState, formAction] = useActionState(
    postMessageAction,
    initialFormState
  );

  React.useEffect(() => {
    if (formState.message === "Message posted successfully.") {
      formRef.current?.reset();
      if (onMessagePosted) {
        onMessagePosted();
      }
    }
    // Optionally handle formState.errors here, e.g., with toast notifications
  }, [formState, onMessagePosted]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex items-center space-x-2 p-4 border-t"
    >
      <input type="hidden" name="threadId" value={threadId} />
      <Textarea
        name="content"
        placeholder="Type your message..."
        rows={1}
        className="flex-grow resize-none"
        required
      />
      <SubmitButton />
      {formState.errors?._form && (
        <p className="text-xs text-destructive mt-1 w-full col-span-2">
          {formState.errors._form.join(", ")}
        </p>
      )}
    </form>
  );
}
