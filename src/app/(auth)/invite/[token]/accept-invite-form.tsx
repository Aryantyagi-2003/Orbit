"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

import { acceptInviteAction, type AcceptInviteState } from "./actions";

const initialState: AcceptInviteState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Joining…" : "Accept invite"}
    </Button>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const boundAction = async () => acceptInviteAction(token);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton />
      {state.status === "error" && state.message && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
