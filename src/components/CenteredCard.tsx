import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

/** The narrow card layout of the sign-in, sign-up and change-password pages. */
export function CenteredCard({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}): ReactNode {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 8 } }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center", mb: 2 }}>
        <ThemeToggle />
        {actions}
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
        {children}
      </Paper>
    </Container>
  );
}
