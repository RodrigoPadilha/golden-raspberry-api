export interface ProducerAwardInterval {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
}

export interface AwardIntervalResult {
  min: ProducerAwardInterval[];
  max: ProducerAwardInterval[];
}
