import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import { ThemeToggle } from "@/components/ThemeToggle";

// Route group "(auth)": shares this layout between /sign-in and /sign-up without adding a URL segment.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 8 } }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <ThemeToggle />
      </Box>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
        {children}
      </Paper>
    </Container>
  );
}
