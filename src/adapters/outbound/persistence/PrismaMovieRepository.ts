import { PrismaClient } from "@prisma/client";
import { MovieWithProducers, CreateMovieInput } from "../../../domain/entities/Movie";
import { MovieRepositoryPort } from "../../../domain/ports/outbound/MovieRepositoryPort";
import { RepositoryError } from "../../../domain/errors/RepositoryError";

const movieInclude = {
  producers: {
    include: { producer: true },
  },
} as const;

function toMovieWithProducers(raw: {
  id: number;
  year: number;
  title: string;
  studios: string;
  winner: boolean;
  producers: { producer: { id: number; name: string } }[];
}): MovieWithProducers {
  return {
    id: raw.id,
    year: raw.year,
    title: raw.title,
    studios: raw.studios,
    winner: raw.winner,
    producers: raw.producers.map((mp) => ({
      id: mp.producer.id,
      name: mp.producer.name,
    })),
  };
}

export class PrismaMovieRepository implements MovieRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<MovieWithProducers[]> {
    try {
      const movies = await this.prisma.movie.findMany({
        include: movieInclude,
        orderBy: { year: "asc" },
      });
      return movies.map(toMovieWithProducers);
    } catch (error) {
      throw new RepositoryError("findAll", error as Error);
    }
  }

  async findById(id: number): Promise<MovieWithProducers | null> {
    try {
      const movie = await this.prisma.movie.findUnique({
        where: { id },
        include: movieInclude,
      });
      return movie ? toMovieWithProducers(movie) : null;
    } catch (error) {
      throw new RepositoryError("findById", error as Error);
    }
  }

  async findWinners(): Promise<MovieWithProducers[]> {
    try {
      const movies = await this.prisma.movie.findMany({
        where: { winner: true },
        include: movieInclude,
        orderBy: { year: "asc" },
      });
      return movies.map(toMovieWithProducers);
    } catch (error) {
      throw new RepositoryError("findWinners", error as Error);
    }
  }

  async findByProducerName(name: string): Promise<MovieWithProducers[]> {
    try {
      const movies = await this.prisma.movie.findMany({
        where: {
          producers: {
            some: { producer: { name } },
          },
        },
        include: movieInclude,
        orderBy: { year: "asc" },
      });
      return movies.map(toMovieWithProducers);
    } catch (error) {
      throw new RepositoryError("findByProducerName", error as Error);
    }
  }

  async count(): Promise<number> {
    try {
      return await this.prisma.movie.count();
    } catch (error) {
      throw new RepositoryError("count", error as Error);
    }
  }

  async createManyWithProducers(inputs: CreateMovieInput[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const input of inputs) {
          const movie = await tx.movie.create({
            data: {
              year: input.year,
              title: input.title,
              studios: input.studios,
              winner: input.winner,
            },
          });

          for (const producerName of input.producerNames) {
            const producer = await tx.producer.upsert({
              where: { name: producerName },
              update: {},
              create: { name: producerName },
            });

            await tx.movieProducer.create({
              data: {
                movieId: movie.id,
                producerId: producer.id,
              },
            });
          }
        }
      });
    } catch (error) {
      throw new RepositoryError("createManyWithProducers", error as Error);
    }
  }
}
