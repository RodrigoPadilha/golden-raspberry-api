import type { IHttpServerAdapter } from "../adapters/ports/inbound/IHttpServerAdapter";
import type { IDatabase } from "../adapters/ports/outbound/IDatabase";
import { MovieFactoryAdapter } from "../factories/MovieFactoryAdapter";
import { ProducerFactoryAdapter } from "../factories/ProducerFactoryAdapter";

/**
 * Orquestra o registro de rotas. Recebe httpServer e database,
 * repassa às factories que instanciam seus respectivos repository, service e controller.
 *
 * Novos domínios: adicione nova Factory aqui e chame make*Controller().
 * Se o número de domínios crescer muito, considere o padrão Registry:
 * um array de funções registerRoutes(httpServer, database) que cada domínio exporta.
 */
export class RouterAdapter {
  constructor(
    private readonly httpServer: IHttpServerAdapter,
    private readonly database: IDatabase,
  ) {}

  start(): void {
    console.log("> [RouterAdapter] starting routes...");

    const movieFactory = new MovieFactoryAdapter(
      this.httpServer,
      this.database,
    );
    movieFactory.makeListMoviesController();
    movieFactory.makeGetMovieByIdController();

    const producerFactory = new ProducerFactoryAdapter(
      this.httpServer,
      this.database,
    );
    producerFactory.makeListProducersController();
    producerFactory.makeGetAwardIntervalsController();
    producerFactory.makeGetMoviesByProducerController();

    console.log("> [RouterAdapter] routes started...");
  }
}
