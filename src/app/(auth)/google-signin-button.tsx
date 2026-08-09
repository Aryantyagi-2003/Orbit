"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.43 3.58v3h3.93c2.3-2.12 3.52-5.24 3.52-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.93-3c-1.09.73-2.5 1.16-4 1.16-3.08 0-5.68-2.08-6.61-4.87H1.34v3.09C3.31 21.3 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.39 14.38A7.2 7.2 0 0 1 5 12c0-.83.14-1.64.38-2.38V6.53H1.34A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.34 5.47l4.05-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.33 0 3.31 2.7 1.34 6.53l4.05 3.09C6.32 6.83 8.92 4.75 12 4.75z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full gap-2 bg-card"
      disabled={pending}
    >
      <GoogleIcon />
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
