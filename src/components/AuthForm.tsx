"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useActionState, useState, type FormEvent, type ReactNode } from "react";
import { signInAction, signUpAction } from "@/app/(auth)/actions";
import { INITIAL_FORM_STATE } from "@/shared/form-state";

interface AuthFormProps {
  mode: "sign-up" | "sign-in";
  notice?: string;
}

const PASSWORD_MISMATCH = "Passwords do not match";

/**
 * One form for both modes. useActionState wires the form to a Server Action and gives back the
 * action's result (errors, echoed values) plus a pending flag, without any fetch code.
 */
export function AuthForm({ mode, notice }: AuthFormProps): ReactNode {
  const isSignUp = mode === "sign-up";
  const [state, formAction, pending] = useActionState(
    isSignUp ? signUpAction : signInAction,
    INITIAL_FORM_STATE,
  );
  const [mismatch, setMismatch] = useState(false);

  // Checked before anything is sent: a mismatch never reaches the server. The server checks again.
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    if (!isSignUp) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const differs = data.get("password") !== data.get("confirmPassword");
    setMismatch(differs);
    if (differs) {
      event.preventDefault();
    }
  }

  const fieldError = (name: string): string | undefined => state.fieldErrors?.[name];
  const confirmError = mismatch ? PASSWORD_MISMATCH : fieldError("confirmPassword");

  return (
    <Stack component="form" action={formAction} onSubmit={handleSubmit} spacing={2}>
      <Typography variant="h5" component="h1">
        {isSignUp ? "Create an account" : "Sign in"}
      </Typography>

      {notice && <Alert severity="info">{notice}</Alert>}
      {state.formError && (
        <Alert severity="error" role="alert">
          {state.formError}
        </Alert>
      )}

      {isSignUp && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            name="firstName"
            label="First name"
            required
            fullWidth
            autoComplete="given-name"
            defaultValue={state.values?.firstName}
            error={Boolean(fieldError("firstName"))}
            helperText={fieldError("firstName")}
          />
          <TextField
            name="lastName"
            label="Last name"
            required
            fullWidth
            autoComplete="family-name"
            defaultValue={state.values?.lastName}
            error={Boolean(fieldError("lastName"))}
            helperText={fieldError("lastName")}
          />
        </Stack>
      )}
      <TextField
        name="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        defaultValue={state.values?.email}
        error={Boolean(fieldError("email"))}
        helperText={fieldError("email")}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        required
        autoComplete={isSignUp ? "new-password" : "current-password"}
        error={Boolean(fieldError("password"))}
        helperText={fieldError("password") ?? (isSignUp ? "At least 8 characters" : undefined)}
      />
      {isSignUp && (
        <TextField
          name="confirmPassword"
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          onChange={() => setMismatch(false)}
          error={Boolean(confirmError)}
          helperText={confirmError}
        />
      )}

      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {isSignUp ? "Sign up" : "Sign in"}
      </Button>

      <Typography variant="body2" sx={{ textAlign: "center" }}>
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <Link component={NextLink} href={isSignUp ? "/sign-in" : "/sign-up"}>
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </Typography>
    </Stack>
  );
}
