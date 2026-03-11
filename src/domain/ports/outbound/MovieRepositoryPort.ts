import { MovieWithProducers, CreateMovieInput } from "../../entities/Movie";

export interface MovieRepositoryPort {
  findAll(): Promise<MovieWithProducers[]>;
  findById(id: number): Promise<MovieWithProducers | null>;
  findWinners(): Promise<MovieWithProducers[]>;
  findByProducerName(name: string): Promise<MovieWithProducers[]>;
  count(): Promise<number>;
  createManyWithProducers(inputs: CreateMovieInput[]): Promise<void>;
}
