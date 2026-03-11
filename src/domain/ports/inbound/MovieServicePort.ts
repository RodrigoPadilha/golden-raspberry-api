import { MovieWithProducers } from "../../entities/Movie";

export interface MovieServicePort {
  getAll(): Promise<MovieWithProducers[]>;
  getById(id: number): Promise<MovieWithProducers | null>;
}
