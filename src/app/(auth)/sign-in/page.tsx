import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { requireNoSession } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Sign in · User Admin" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  await requireNoSession();
  const { expired } = await searchParams;
  const notice = expired ? "Your session has ended. Please sign in again." : undefined;
  return <AuthForm mode="sign-in" notice={notice} />;
}
