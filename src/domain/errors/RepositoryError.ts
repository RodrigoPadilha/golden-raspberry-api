import { DomainError } from "./DomainError";

export class RepositoryError extends DomainError {
  constructor(operation: string, cause?: unknown) {
    super(
      `Repository error during "${operation}"`,
      cause instanceof Error ? cause : undefined
    );
  }
}
