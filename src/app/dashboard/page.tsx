import AppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Dashboard · User Admin" };

// Server Component: the session check and (from task 12) the user query run on the server.
export default async function DashboardPage() {
  const { user } = await requireUser();

  return (
    <>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Hello, {user.firstName}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ThemeToggle />
            <SignOutButton />
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">User management comes next.</Typography>
      </Container>
    </>
  );
}
