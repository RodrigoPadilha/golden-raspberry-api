import { PrismaClient } from "@prisma/client";
import type { IHttpServerAdapter } from "../adapters/ports/inbound/IHttpServerAdapter";
import type { IDatabase } from "../adapters/ports/outbound/IDatabase";
import { PrismaMovieRepository } from "../adapters/outbound/persistence/PrismaMovieRepository";
import { MovieService } from "../domain/services/MovieService";
import { MovieController } from "../adapters/inbound/http/controllers/MovieController";

export class MovieFactoryAdapter {
  private readonly movieController: MovieController;

  constructor(
    private readonly httpServer: IHttpServerAdapter,
    database: IDatabase
  ) {
    const client = database.getClient() as PrismaClient;
    const repository = new PrismaMovieRepository(client);
    const service = new MovieService(repository);
    this.movieController = new MovieController(this.httpServer, service);
  }

  makeListMoviesController = (): void => {
    this.movieController.registerEndpointListMovies();
  };

  makeGetMovieByIdController = (): void => {
    this.movieController.registerEndpointGetMovieById();
  };
}
