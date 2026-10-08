/**
 * What a Server Action returns to a form (via useActionState). Plain serializable data only.
 * `values` echoes the non-secret fields so the form keeps them after a failed submit; passwords
 * are never sent back.
 */
export interface FormState {
  /** Set when the action succeeded, e.g. so a dialog can close. */
  ok?: boolean;
  formError?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

export const INITIAL_FORM_STATE: FormState = {};
