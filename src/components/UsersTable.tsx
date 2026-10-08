"use client";

import Chip from "@mui/material/Chip";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { PublicUser } from "@/domain/user";
import { PAGE_SIZES } from "@/shared/schemas";

export interface UsersTableProps {
  users: PublicUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  currentUserId: string;
}

// Fixed locale and time zone: this component renders on the server and again in the browser, and
// both must produce the same text (a local time zone would cause a hydration mismatch).
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function pageHref(page: number, pageSize: number): string {
  return `/dashboard?page=${page}&pageSize=${pageSize}`;
}

/**
 * Receives one page of plain data from the Server Component. Navigation only changes the URL; the
 * server renders the new page. No client-side fetching or loading state.
 */
export function UsersTable({
  users,
  page,
  pageSize,
  total,
  totalPages,
  currentUserId,
}: UsersTableProps): ReactNode {
  const router = useRouter();

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" component="h2">
          Users
        </Typography>
        <Typography color="text.secondary" data-testid="users-total">
          {total} {total === 1 ? "user" : "users"}
        </Typography>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="Users">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Logins</TableCell>
              <TableCell>Created (UTC)</TableCell>
              <TableCell>Updated (UTC)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  {user.firstName} {user.lastName}
                  {user.id === currentUserId && (
                    <Chip label="You" size="small" variant="outlined" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.status === "active" ? "Active" : "Inactive"}
                    color={user.status === "active" ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{user.loginsCounter}</TableCell>
                <TableCell>{dateFormat.format(user.createdAt)}</TableCell>
                <TableCell>{dateFormat.format(user.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <TextField
          select
          size="small"
          label="Rows per page"
          value={pageSize}
          onChange={(event) => router.push(pageHref(1, Number(event.target.value)))}
          slotProps={{ select: { native: true } }}
          sx={{ minWidth: 140 }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </TextField>
        {/* Real links: pages work without JavaScript and Next.js prefetches them. */}
        <Pagination
          page={page}
          count={totalPages}
          renderItem={(item) => (
            <PaginationItem
              component={NextLink}
              href={pageHref(item.page ?? 1, pageSize)}
              {...item}
            />
          )}
        />
      </Stack>
    </Stack>
  );
}
