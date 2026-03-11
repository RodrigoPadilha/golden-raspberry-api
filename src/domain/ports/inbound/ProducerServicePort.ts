import { MovieWithProducers } from "../../entities/Movie";
import { AwardIntervalResult } from "../../entities/ProducerAwardInterval";
import { ProducerSummary } from "../outbound/ProducerRepositoryPort";

export interface ProducerServicePort {
  getAll(): Promise<ProducerSummary[]>;
  getAwardIntervals(): Promise<AwardIntervalResult>;
  getMoviesByProducer(name: string): Promise<MovieWithProducers[]>;
}
