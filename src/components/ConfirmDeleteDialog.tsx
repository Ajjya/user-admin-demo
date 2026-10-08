"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useActionState, type ReactNode } from "react";
import { deleteUserAction } from "@/app/dashboard/actions";
import type { PublicUser } from "@/domain/user";
import { INITIAL_FORM_STATE } from "@/shared/form-state";

export function ConfirmDeleteDialog({
  user,
  onClose,
}: {
  user: PublicUser;
  onClose: () => void;
}): ReactNode {
  const [state, formAction, pending] = useActionState(async () => {
    const result = await deleteUserAction(user.id);
    if (result.ok) {
      onClose();
    }
    return result;
  }, INITIAL_FORM_STATE);

  return (
    <Dialog open onClose={onClose} aria-labelledby="delete-dialog-title">
      <form action={formAction}>
        <DialogTitle id="delete-dialog-title">Delete user?</DialogTitle>
        <DialogContent>
          {state.formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.formError}
            </Alert>
          )}
          <DialogContentText>
            {user.firstName} {user.lastName} ({user.email}) will be removed from the list and signed
            out. The email address stays reserved.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" color="error" variant="contained" disabled={pending}>
            Delete
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
