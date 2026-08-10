"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createOrgAction, type CreateOrgState } from "./actions";

const initialState: CreateOrgState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
          Creating…
        </span>
      ) : (
        "Create organization"
      )}
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useFormState(createOrgAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          name="name"
          placeholder="Acme Co."
          autoComplete="organization"
          required
          className="mt-1.5"
        />
        {state.status === "error" && state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {state.fieldErrors.name[0]}
          </p>
        )}
      </div>
      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}
      <SubmitButton />
    </form>
  );
}
