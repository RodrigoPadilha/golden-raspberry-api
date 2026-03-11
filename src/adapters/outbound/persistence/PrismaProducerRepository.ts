import { PrismaClient } from "@prisma/client";
import {
  ProducerRepositoryPort,
  ProducerSummary,
} from "../../../domain/ports/outbound/ProducerRepositoryPort";
import { RepositoryError } from "../../../domain/errors/RepositoryError";

export class PrismaProducerRepository implements ProducerRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllWithWinCount(): Promise<ProducerSummary[]> {
    try {
      const producers = await this.prisma.producer.findMany({
        include: {
          movies: {
            include: { movie: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return producers.map((p) => ({
        name: p.name,
        winCount: p.movies.filter((mp) => mp.movie.winner).length,
      }));
    } catch (error) {
      throw new RepositoryError("findAllWithWinCount", error as Error);
    }
  }
}
