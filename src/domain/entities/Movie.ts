export interface Movie {
  id?: number;
  year: number;
  title: string;
  studios: string;
  winner: boolean;
}

export interface MovieWithProducers extends Movie {
  producers: { id: number; name: string }[];
}

export interface CreateMovieInput {
  year: number;
  title: string;
  studios: string;
  winner: boolean;
  producerNames: string[];
}
