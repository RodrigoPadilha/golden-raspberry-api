import type {
  IHttpServerAdapter,
  HttpInput,
} from "../../../ports/inbound/IHttpServerAdapter";
import { MovieServicePort } from "../../../../domain/ports/inbound/MovieServicePort";
import { DomainError } from "../../../../domain/errors/DomainError";
import { MovieNotFoundError } from "../../../../domain/errors/MovieNotFoundError";
import { toMovieDTO } from "../dtos/MovieDTO";
import {
  ok,
  notFound,
  badRequest,
  serverError,
} from "../helpers/httpResponses";

export class MovieController {
  constructor(
    private readonly httpServer: IHttpServerAdapter,
    private readonly movieService: MovieServicePort
  ) {}

  registerEndpointListMovies(): void {
    this.httpServer.register("get", "/api/movies", async () => {
      try {
        const movies = await this.movieService.getAll();
        return ok(movies.map(toMovieDTO));
      } catch (error) {
        return this.handleError(error);
      }
    });
  }

  registerEndpointGetMovieById(): void {
    this.httpServer.register(
      "get",
      "/api/movies/:id",
      async (input: HttpInput) => {
        try {
          const id = parseInt(input.params.id ?? "", 10);
          if (isNaN(id)) {
            return badRequest("Invalid movie ID");
          }
          const movie = await this.movieService.getById(id);
          if (!movie) {
            return notFound("Movie not found");
          }
          return ok(toMovieDTO(movie));
        } catch (error) {
          return this.handleError(error);
        }
      }
    );
  }

  private handleError(error: unknown) {
    if (error instanceof MovieNotFoundError) {
      return notFound(error.message);
    }
    if (error instanceof DomainError) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
