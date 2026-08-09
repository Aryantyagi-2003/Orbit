import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  // "Display Name <address@domain>" or a bare address — Resend accepts both.
  EMAIL_FROM: z.string().min(3),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // eslint-disable-next-line no-console
    console.error(
      `\n✖ Invalid or missing environment variables:\n${issues}\n\nCheck .env against .env.example and restart.\n`,
    );
    throw new Error("Invalid environment configuration — see errors above.");
  }

  return parsed.data;
}

export const env = loadEnv();
