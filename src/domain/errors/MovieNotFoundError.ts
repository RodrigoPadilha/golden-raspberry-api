import { DomainError } from "./DomainError";

export class MovieNotFoundError extends DomainError {
  constructor(id: number) {
    super(`Movie with id ${id} not found`);
  }
}
