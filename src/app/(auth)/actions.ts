"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import {
  EmailAlreadyRegisteredError,
  createUserWithPassword,
} from "@/lib/data/users";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function clientKey() {
  const forwardedFor = headers().get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

async function enforceRateLimit(action: string): Promise<string | null> {
  const key = `${action}:${clientKey()}`;
  try {
    const { success } = await authRateLimit.limit(key);
    if (!success) {
      return "Too many attempts. Wait a minute before trying again.";
    }
    return null;
  } catch {
    // Fail closed: if the rate limiter backend is unreachable, refuse the
    // auth attempt rather than let it through unchecked or crash with a 500.
    return "Auth is temporarily unavailable. Try again shortly.";
  }
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const limitError = await enforceRateLimit("signup");
  if (limitError) return { status: "error", message: limitError };

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { user, token } = await createUserWithPassword(parsed.data);
    await sendVerificationEmail(user.email, token);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return {
        status: "error",
        fieldErrors: { email: [error.message] },
      };
    }
    return {
      status: "error",
      message: "Something went wrong creating your account. Try again.",
    };
  }

  return {
    status: "success",
    message:
      "Check your inbox — we sent a verification link to finish setting up your account.",
  };
}

// Only ever redirect to a same-origin relative path — a callbackUrl is
// client-supplied (a query param a user could hand-edit), so treat it as
// untrusted input, not a trusted destination.
function safeCallbackUrl(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export async function signInWithGoogleAction(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  await signIn("google", { redirectTo: callbackUrl });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const limitError = await enforceRateLimit("signin");
  if (limitError) return { status: "error", message: limitError };

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = "code" in error ? String(error.code) : error.type;
      if (code === "email-not-verified") {
        return {
          status: "error",
          message:
            "Verify your email before signing in — check your inbox for the link.",
        };
      }
      return { status: "error", message: "Incorrect email or password." };
    }
    throw error;
  }

  return { status: "success" };
}
