import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CenteredCard } from "@/components/CenteredCard";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { SignOutButton } from "@/components/SignOutButton";
import { requireSession } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Change password · User Admin" };

/** The only page a user with a temporary password can open (besides logging out). */
export default async function ChangePasswordPage() {
  // requireSession, not requireUser: requireUser would redirect back here forever.
  const { user } = await requireSession();
  if (!user.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <CenteredCard actions={<SignOutButton />}>
      <ChangePasswordForm firstName={user.firstName} />
    </CenteredCard>
  );
}
