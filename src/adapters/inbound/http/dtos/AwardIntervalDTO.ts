export interface ProducerAwardIntervalDTO {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
}

export interface AwardIntervalDTO {
  min: ProducerAwardIntervalDTO[];
  max: ProducerAwardIntervalDTO[];
}
