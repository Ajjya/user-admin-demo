import AppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UsersTable } from "@/components/UsersTable";
import { requireUser } from "@/server/auth/dal";
import { getServices } from "@/server/services/container";
import { DEFAULT_PAGE_SIZE, listUsersQuerySchema } from "@/shared/schemas";

export const metadata: Metadata = { title: "Dashboard · User Admin" };

/**
 * Server Component: checks the session and queries MongoDB directly through the service layer, then
 * hands plain data to the interactive table. The page and page size come from the URL, so
 * pagination is server-side and every page has its own shareable address.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { user } = await requireUser();

  // A hand-edited URL (e.g. ?pageSize=7) shows the default page instead of an error.
  const parsed = listUsersQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : { page: 1, pageSize: DEFAULT_PAGE_SIZE };
  const result = await getServices().userService.list(query);

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
        <UsersTable
          users={result.items}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          totalPages={result.totalPages}
          currentUserId={user.id}
        />
      </Container>
    </>
  );
}
