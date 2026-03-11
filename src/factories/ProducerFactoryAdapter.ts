import { PrismaClient } from "@prisma/client";
import type { IHttpServerAdapter } from "../adapters/ports/inbound/IHttpServerAdapter";
import type { IDatabase } from "../adapters/ports/outbound/IDatabase";
import { PrismaMovieRepository } from "../adapters/outbound/persistence/PrismaMovieRepository";
import { PrismaProducerRepository } from "../adapters/outbound/persistence/PrismaProducerRepository";
import { ProducerService } from "../domain/services/ProducerService";
import { ProducerController } from "../adapters/inbound/http/controllers/ProducerController";

export class ProducerFactoryAdapter {
  private readonly producerController: ProducerController;

  constructor(
    private readonly httpServer: IHttpServerAdapter,
    database: IDatabase
  ) {
    const client = database.getClient() as PrismaClient;
    const movieRepository = new PrismaMovieRepository(client);
    const producerRepository = new PrismaProducerRepository(client);
    const service = new ProducerService(movieRepository, producerRepository);
    this.producerController = new ProducerController(this.httpServer, service);
  }

  makeListProducersController = (): void => {
    this.producerController.registerEndpointListProducers();
  };

  makeGetAwardIntervalsController = (): void => {
    this.producerController.registerEndpointGetAwardIntervals();
  };

  makeGetMoviesByProducerController = (): void => {
    this.producerController.registerEndpointGetMoviesByProducer();
  };
}
