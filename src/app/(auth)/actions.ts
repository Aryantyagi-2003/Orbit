"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
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

export async function signInWithGoogleAction() {
  await signIn("google", { redirectTo: "/dashboard" });
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
      redirectTo: "/dashboard",
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
