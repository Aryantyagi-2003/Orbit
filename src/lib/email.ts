import { Resend } from "resend";

import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Verify your Orbit account",
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #262019;">
        <h1 style="font-size: 20px;">Verify your email</h1>
        <p>Confirm this address to finish setting up your Orbit account.</p>
        <p>
          <a href="${url}" style="display: inline-block; padding: 10px 20px; background: #7a2e2e; color: #f5f0e6; text-decoration: none; border-radius: 4px;">
            Verify email
          </a>
        </p>
        <p style="font-size: 13px; color: #6b6355;">This link expires in 24 hours. If you didn't create an Orbit account, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }

  return data.id;
}
