import { MovieWithProducers } from "../../../../domain/entities/Movie";

export interface MovieDTO {
  id: number;
  year: number;
  title: string;
  studios: string;
  winner: boolean;
  producers: string[];
}

export function toMovieDTO(movie: MovieWithProducers): MovieDTO {
  return {
    id: movie.id!,
    year: movie.year,
    title: movie.title,
    studios: movie.studios,
    winner: movie.winner,
    producers: movie.producers.map((p) => p.name),
  };
}
