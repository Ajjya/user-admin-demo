import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { requireNoSession } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Sign up · User Admin" };

export default async function SignUpPage() {
  await requireNoSession();
  return <AuthForm mode="sign-up" />;
}
