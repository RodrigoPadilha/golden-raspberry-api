import type {
  IHttpServerAdapter,
  HttpInput,
} from "../../../ports/inbound/IHttpServerAdapter";
import { ProducerServicePort } from "../../../../domain/ports/inbound/ProducerServicePort";
import { DomainError } from "../../../../domain/errors/DomainError";
import { toMovieDTO } from "../dtos/MovieDTO";
import {
  ok,
  notFound,
  badRequest,
  serverError,
} from "../helpers/httpResponses";

export class ProducerController {
  constructor(
    private readonly httpServer: IHttpServerAdapter,
    private readonly producerService: ProducerServicePort
  ) {}

  registerEndpointListProducers(): void {
    this.httpServer.register("get", "/api/producers", async () => {
      try {
        const producers = await this.producerService.getAll();
        return ok(producers);
      } catch (error) {
        return this.handleError(error);
      }
    });
  }

  registerEndpointGetAwardIntervals(): void {
    this.httpServer.register(
      "get",
      "/api/producers/awards-interval",
      async () => {
        try {
          const result = await this.producerService.getAwardIntervals();
          return ok(result);
        } catch (error) {
          return this.handleError(error);
        }
      }
    );
  }

  registerEndpointGetMoviesByProducer(): void {
    this.httpServer.register(
      "get",
      "/api/producers/:name/movies",
      async (input: HttpInput) => {
        try {
          const name = decodeURIComponent(input.params.name ?? "");
          if (!name) {
            return badRequest("Producer name is required");
          }
          const movies = await this.producerService.getMoviesByProducer(name);
          if (movies.length === 0) {
            return notFound(`No movies found for producer "${name}"`);
          }
          return ok(movies.map(toMovieDTO));
        } catch (error) {
          return this.handleError(error);
        }
      }
    );
  }

  private handleError(error: unknown) {
    if (error instanceof DomainError) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
