import type { IHttpServerAdapter } from "./adapters/ports/inbound/IHttpServerAdapter";
import type { IDatabase } from "./adapters/ports/outbound/IDatabase";
import { PrismaClient } from "@prisma/client";
import { PrismaDatabaseAdapter } from "./adapters/outbound/database/PrismaDatabaseAdapter";
import { PrismaMovieRepository } from "./adapters/outbound/persistence/PrismaMovieRepository";
import { CsvMovieLoaderAdapter } from "./adapters/outbound/csv/CsvMovieLoaderAdapter";
import { ExpressHttpServerAdapter } from "./adapters/inbound/http/routes/ExpressHttpServerAdapter";
import { RouterAdapter } from "./infra/RouterAdapter";

export interface AppContext {
  httpServer: IHttpServerAdapter;
  database: IDatabase;
}

export interface BootstrapOptions {
  databaseUrl?: string;
  csvFilePath?: string;
}

export async function bootstrap(
  options?: BootstrapOptions,
): Promise<AppContext> {
  const database: IDatabase = new PrismaDatabaseAdapter();
  await database.initDatabase(options?.databaseUrl);

  if (options?.csvFilePath) {
    const client = database.getClient() as PrismaClient;
    const movieRepository = new PrismaMovieRepository(client);
    const csvLoader = new CsvMovieLoaderAdapter(movieRepository);
    await csvLoader.load(options.csvFilePath);
  }

  const httpServer = new ExpressHttpServerAdapter();
  const router = new RouterAdapter(httpServer, database);
  router.start();

  return { httpServer, database };
}
