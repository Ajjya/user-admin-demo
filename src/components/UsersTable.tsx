"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
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
import { useState, type ReactNode } from "react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { UserDialog } from "@/components/UserDialog";
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

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; user: PublicUser }
  | { kind: "delete"; user: PublicUser }
  | null;

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
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const closeDialog = (): void => setDialog(null);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" component="h2">
          Users
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography color="text.secondary" data-testid="users-total">
            {total} {total === 1 ? "user" : "users"}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ kind: "create" })}
          >
            Create user
          </Button>
        </Stack>
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
              <TableCell align="right">Actions</TableCell>
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
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton
                    size="small"
                    aria-label="Edit"
                    title="Edit"
                    onClick={() => setDialog({ kind: "edit", user })}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  {/* You cannot delete yourself (the server rejects it too). */}
                  {user.id !== currentUserId && (
                    <IconButton
                      size="small"
                      aria-label="Delete"
                      title="Delete"
                      onClick={() => setDialog({ kind: "delete", user })}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
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

      {dialog?.kind === "create" && <UserDialog onClose={closeDialog} />}
      {dialog?.kind === "edit" && (
        <UserDialog
          user={dialog.user}
          isSelf={dialog.user.id === currentUserId}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === "delete" && <ConfirmDeleteDialog user={dialog.user} onClose={closeDialog} />}
    </Stack>
  );
}
