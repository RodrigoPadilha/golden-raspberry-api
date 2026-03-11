import { MovieWithProducers } from "../entities/Movie";
import { MovieServicePort } from "../ports/inbound/MovieServicePort";
import { MovieRepositoryPort } from "../ports/outbound/MovieRepositoryPort";

export class MovieService implements MovieServicePort {
  constructor(private readonly movieRepository: MovieRepositoryPort) {}

  async getAll(): Promise<MovieWithProducers[]> {
    return this.movieRepository.findAll();
  }

  async getById(id: number): Promise<MovieWithProducers | null> {
    return this.movieRepository.findById(id);
  }
}
