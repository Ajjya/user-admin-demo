import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ThemeToggle } from "@/components/ThemeToggle";

// Placeholder until the auth flow redirects from here (task 10).
export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" component="h1">
          User Admin
        </Typography>
        <ThemeToggle />
      </Stack>
    </Container>
  );
}
