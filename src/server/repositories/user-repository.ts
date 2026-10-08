import type { User } from "@/domain/user";

export interface UserRepository {
  /** Throws DomainError EMAIL_TAKEN when the email already exists (deleted users included). */
  insert(user: User): Promise<void>;
  /** Non-deleted users only. */
  findById(id: string): Promise<User | null>;
  /** Includes deleted users: sign-in must tell "deleted" apart from "never existed" internally. */
  findByEmail(email: string): Promise<User | null>;
  /** Non-deleted users, newest first. */
  list(params: { skip: number; limit: number }): Promise<User[]>;
  /** Non-deleted users. */
  count(): Promise<number>;
  /** Persists the mutable fields only; loginsCounter is changed exclusively by incrementLogins. */
  save(user: User): Promise<void>;
  /**
   * Atomically increments loginsCounter if the user is active and not deleted.
   * Returns the updated user, or null when the condition did not match.
   */
  incrementLoginsIfActive(id: string): Promise<User | null>;
}
