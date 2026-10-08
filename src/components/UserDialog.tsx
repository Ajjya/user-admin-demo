"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState, type ReactNode } from "react";
import { createUserAction, updateUserAction } from "@/app/dashboard/actions";
import type { PublicUser } from "@/domain/user";
import { INITIAL_FORM_STATE, type FormState } from "@/shared/form-state";

interface UserDialogProps {
  /** Absent for "create". */
  user?: PublicUser;
  isSelf?: boolean;
  onClose: () => void;
}

/**
 * Create and edit share one form. The UI mirrors the server rules (email read-only, names locked
 * while inactive, no self-deactivation) for a better experience; the server enforces them anyway.
 */
export function UserDialog({ user, isSelf = false, onClose }: UserDialogProps): ReactNode {
  const isEdit = Boolean(user);
  const action = user ? updateUserAction.bind(null, user.id) : createUserAction;

  // Wrapping the Server Action lets the dialog close itself once the action reports success.
  const [state, formAction, pending] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.ok) {
        onClose();
      }
      return result;
    },
    INITIAL_FORM_STATE,
  );

  const error = (name: string): string | undefined => state.fieldErrors?.[name];
  const value = (name: "firstName" | "lastName" | "email" | "status"): string | undefined =>
    state.values?.[name] ?? user?.[name];
  const namesLocked = user?.status === "inactive";

  let passwordHelp: string;
  if (!isEdit) {
    passwordHelp = "The user must replace it after the first sign-in.";
  } else if (isSelf) {
    passwordHelp = "Leave empty to keep your current password.";
  } else {
    passwordHelp = "Leave empty to keep it. A new password is temporary and signs the user out.";
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="user-dialog-title">
      <form action={formAction}>
        <DialogTitle id="user-dialog-title">{isEdit ? "Edit user" : "Create user"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {state.formError && <Alert severity="error">{state.formError}</Alert>}
            {namesLocked && (
              <Alert severity="info">
                The name of an inactive user cannot be changed. Activate the user first.
              </Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                name="firstName"
                label="First name"
                required
                fullWidth
                disabled={namesLocked}
                defaultValue={value("firstName")}
                error={Boolean(error("firstName"))}
                helperText={error("firstName")}
              />
              <TextField
                name="lastName"
                label="Last name"
                required
                fullWidth
                disabled={namesLocked}
                defaultValue={value("lastName")}
                error={Boolean(error("lastName"))}
                helperText={error("lastName")}
              />
            </Stack>

            <TextField
              // Not submitted when editing: the email is immutable.
              name={isEdit ? undefined : "email"}
              label="Email"
              type="email"
              required={!isEdit}
              defaultValue={value("email")}
              error={Boolean(error("email"))}
              helperText={error("email") ?? (isEdit ? "The email cannot be changed." : undefined)}
              slotProps={{ htmlInput: { readOnly: isEdit } }}
            />

            <TextField
              select
              name="status"
              label="Status"
              defaultValue={value("status") ?? "active"}
              disabled={isSelf}
              helperText={isSelf ? "You cannot deactivate your own account." : error("status")}
              slotProps={{ select: { native: true } }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </TextField>

            <TextField
              name="password"
              label={isEdit ? "New password" : "Temporary password"}
              type="password"
              required={!isEdit}
              autoComplete="new-password"
              error={Boolean(error("password"))}
              helperText={error("password") ?? passwordHelp}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
