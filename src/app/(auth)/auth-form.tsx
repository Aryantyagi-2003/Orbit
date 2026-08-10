"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  type AuthActionState,
  signInAction,
  signInWithGoogleAction,
  signUpAction,
} from "./actions";
import { GoogleSignInButton } from "./google-signin-button";

const initialState: AuthActionState = { status: "idle" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
          {label === "Sign in" ? "Signing in…" : "Creating account…"}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-xs text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

export function AuthForm({ callbackUrl }: { callbackUrl?: string }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signInState, signInFormAction] = useFormState(
    signInAction,
    initialState,
  );
  const [signUpState, signUpFormAction] = useFormState(
    signUpAction,
    initialState,
  );

  const state = mode === "sign-in" ? signInState : signUpState;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "sign-in"
            ? "Sign in to your organization's ledger."
            : "Start tracking team spend in a few minutes."}
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-sm border border-input bg-secondary/50 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("sign-in")}
          className={cn(
            "rounded-sm py-1.5 font-medium transition-colors",
            mode === "sign-in"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign-up")}
          className={cn(
            "rounded-sm py-1.5 font-medium transition-colors",
            mode === "sign-up"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sign up
        </button>
      </div>

      <form action={signInWithGoogleAction}>
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <GoogleSignInButton />
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      {mode === "sign-in" ? (
        <form action={signInFormAction} className="space-y-4">
          {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
          <div>
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1.5"
            />
            <FieldError messages={signInState.fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1.5"
            />
            <FieldError messages={signInState.fieldErrors?.password} />
          </div>
          <SubmitButton label="Sign in" />
        </form>
      ) : (
        <form action={signUpFormAction} className="space-y-4">
          <div>
            <Label htmlFor="signup-name">Name</Label>
            <Input
              id="signup-name"
              name="name"
              autoComplete="name"
              required
              className="mt-1.5"
            />
            <FieldError messages={signUpState.fieldErrors?.name} />
          </div>
          <div>
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1.5"
            />
            <FieldError messages={signUpState.fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1.5"
            />
            <FieldError messages={signUpState.fieldErrors?.password} />
            <p className="mt-1 text-xs text-muted-foreground">
              At least 8 characters, with an uppercase letter and a number.
            </p>
          </div>
          <SubmitButton label="Create account" />
        </form>
      )}

      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}
      {state.status === "success" && state.message && (
        <div
          role="status"
          className="rounded-sm border border-status-good/30 bg-status-good/10 px-3 py-2 text-sm text-foreground"
        >
          {state.message}
        </div>
      )}

      <p className="text-center font-mono text-[11px] text-muted-foreground">
        by continuing you agree to the terms of service
      </p>
    </div>
  );
}
