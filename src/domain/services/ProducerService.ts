import { MovieWithProducers } from "../entities/Movie";
import {
  AwardIntervalResult,
  ProducerAwardInterval,
} from "../entities/ProducerAwardInterval";
import { ProducerServicePort } from "../ports/inbound/ProducerServicePort";
import { MovieRepositoryPort } from "../ports/outbound/MovieRepositoryPort";
import {
  ProducerRepositoryPort,
  ProducerSummary,
} from "../ports/outbound/ProducerRepositoryPort";

export class ProducerService implements ProducerServicePort {
  constructor(
    private readonly movieRepository: MovieRepositoryPort,
    private readonly producerRepository: ProducerRepositoryPort,
  ) {}

  async getAll(): Promise<ProducerSummary[]> {
    return this.producerRepository.findAllWithWinCount();
  }

  async getAwardIntervals(): Promise<AwardIntervalResult> {
    const winners = await this.movieRepository.findWinners();
    return this.calculateIntervals(winners);
  }

  async getMoviesByProducer(name: string): Promise<MovieWithProducers[]> {
    return this.movieRepository.findByProducerName(name);
  }

  private calculateIntervals(
    winners: MovieWithProducers[],
  ): AwardIntervalResult {
    const producerWins = this.groupWinsByProducer(winners); // Exemplo: { "Joel Silver": [1990, 1991] }
    const intervals = this.buildIntervals(producerWins); // Exemplo: [ { producer: "Joel Silver", interval: 1, previousWin: 1990, followingWin: 1991 } ]

    if (intervals.length === 0) {
      return { min: [], max: [] };
    }

    const minInterval = Math.min(...intervals.map((i) => i.interval));
    const maxInterval = Math.max(...intervals.map((i) => i.interval));

    return {
      min: intervals.filter((i) => i.interval === minInterval),
      max: intervals.filter((i) => i.interval === maxInterval),
    };
  }

  private groupWinsByProducer(
    winners: MovieWithProducers[],
  ): Map<string, number[]> {
    const producerWins = new Map<string, number[]>();

    for (const movie of winners) {
      for (const producer of movie.producers) {
        const wins = producerWins.get(producer.name) ?? [];
        wins.push(movie.year);
        producerWins.set(producer.name, wins);
      }
    }

    return producerWins;
  }

  private buildIntervals(
    producerWins: Map<string, number[]>,
  ): ProducerAwardInterval[] {
    const intervals: ProducerAwardInterval[] = [];

    for (const [producer, years] of producerWins) {
      if (years.length < 2) continue; // Ignora produtores com menos de 2 vitórias (não há intervalo).

      years.sort((a, b) => a - b); // Ordena os anos de forma crescente.

      for (let i = 1; i < years.length; i++) {
        // Itera sobre o array de anos de forma crescente.
        intervals.push({
          producer,
          interval: years[i] - years[i - 1],
          previousWin: years[i - 1],
          followingWin: years[i],
        });
      }
    }

    return intervals;
  }
}
