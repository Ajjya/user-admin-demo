"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState, useState, type FormEvent, type ReactNode } from "react";
import { changePasswordAction } from "@/app/change-password/actions";
import { INITIAL_FORM_STATE } from "@/shared/form-state";

const PASSWORD_MISMATCH = "Passwords do not match";

export function ChangePasswordForm({ firstName }: { firstName: string }): ReactNode {
  const [state, formAction, pending] = useActionState(changePasswordAction, INITIAL_FORM_STATE);
  const [mismatch, setMismatch] = useState(false);

  // Same rule as sign-up: a mismatch is caught before anything is sent; the server checks again.
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    const data = new FormData(event.currentTarget);
    const differs = data.get("newPassword") !== data.get("confirmPassword");
    setMismatch(differs);
    if (differs) {
      event.preventDefault();
    }
  }

  const newPasswordError = state.fieldErrors?.newPassword;
  const confirmError = mismatch ? PASSWORD_MISMATCH : state.fieldErrors?.confirmPassword;

  return (
    <Stack component="form" action={formAction} onSubmit={handleSubmit} spacing={2}>
      <Typography variant="h5" component="h1">
        Choose a new password
      </Typography>
      <Alert severity="info">
        Welcome, {firstName}. Your password was set by an administrator. Choose your own password to
        continue.
      </Alert>
      {state.formError && <Alert severity="error">{state.formError}</Alert>}

      <TextField
        name="newPassword"
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        error={Boolean(newPasswordError)}
        helperText={newPasswordError ?? "At least 8 characters"}
      />
      <TextField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        required
        autoComplete="new-password"
        onChange={() => setMismatch(false)}
        error={Boolean(confirmError)}
        helperText={confirmError}
      />

      <Button type="submit" variant="contained" size="large" disabled={pending}>
        Save password
      </Button>
    </Stack>
  );
}
