import LogoutIcon from "@mui/icons-material/Logout";
import Button from "@mui/material/Button";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/(auth)/actions";

/** A plain form posting to a Server Action: works even before JavaScript has loaded. */
export function SignOutButton(): ReactNode {
  return (
    <form action={signOutAction}>
      <Button type="submit" color="inherit" startIcon={<LogoutIcon />}>
        Log out
      </Button>
    </form>
  );
}
