import { AuthForm } from "../auth-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return <AuthForm callbackUrl={searchParams.callbackUrl} />;
}
