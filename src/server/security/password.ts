import "server-only";
import { hash, verify } from "@node-rs/argon2";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

/**
 * Argon2id with the library defaults (m=19 MiB, t=2, p=1), which match the OWASP minimum.
 * The parameters and salt are stored inside the PHC string, so verify() needs nothing else.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
