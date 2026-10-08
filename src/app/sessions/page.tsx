import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/server/auth/dal";
import { getServices } from "@/server/services/container";
import { describeUserAgent } from "@/shared/user-agent";
import { revokeSessionAction } from "./actions";

export const metadata: Metadata = { title: "Sessions · User Admin" };

// Rendered only on the server (no client component in the table), so the local formatting cannot
// cause a hydration mismatch; UTC keeps it consistent with the users table.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/**
 * Your own active sessions. Revoking one signs that device out at its next request; each revoke
 * button is a plain form posting to a Server Action, so the page needs no client-side code.
 */
export default async function SessionsPage() {
  const { user, session: current } = await requireUser();
  const sessions = await getServices().sessionService.listActive(user.id);

  return (
    <>
      <AppHeader firstName={user.firstName} />
      <Container sx={{ py: 4 }}>
        <Stack spacing={2}>
          <div>
            <Typography variant="h5" component="h2">
              Your sessions
            </Typography>
            <Typography color="text.secondary">
              Devices currently signed in to your account. Sessions expire automatically 24 hours
              after sign-in.
            </Typography>
          </div>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Sessions">
              <TableHead>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Signed in (UTC)</TableCell>
                  <TableCell>Expires (UTC)</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => {
                  const isCurrent = session.id === current.id;
                  return (
                    <TableRow key={session.id} hover>
                      <TableCell title={session.userAgent ?? undefined}>
                        {describeUserAgent(session.userAgent)}
                        {isCurrent && (
                          <Chip label="This device" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell>{dateFormat.format(session.createdAt)}</TableCell>
                      <TableCell>{dateFormat.format(session.expiresAt)}</TableCell>
                      <TableCell align="right">
                        {/* The current session ends with "Log out" in the header instead. */}
                        {!isCurrent && (
                          <form action={revokeSessionAction.bind(null, session.id)}>
                            <Button type="submit" size="small" color="error">
                              Revoke
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Container>
    </>
  );
}
